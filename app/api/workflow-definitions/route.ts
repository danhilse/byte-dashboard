import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workflowDefinitions, workflowExecutions } from "@/lib/db/schema";
import { and, count, eq, isNotNull, sql } from "drizzle-orm";
import { requireApiAuth } from "@/lib/auth/api-guard";
import {
  AuthoringCompileError,
  compileAuthoringToRuntime,
  persistableAuthoringPayload,
} from "@/lib/workflow-builder-v2/adapters/definition-runtime-adapter";
import type { WorkflowDefinitionV2 } from "@/lib/workflow-builder-v2/types";
import { normalizeDefinitionStatuses } from "@/lib/workflow-builder-v2/status-guardrails";
import { withApiRequestLogging } from "@/lib/logging/api-route";

function toIsoTimestamp(value: Date | string | null): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * GET /api/workflow-definitions
 *
 * Lists active workflow definitions for the authenticated organization.
 *
 * Query params:
 * - full=true: Return all columns (steps, phases, etc.) for the builder UI
 * - Default: Lightweight response (id, name, description, version) for pickers
 */
async function GETHandler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const full = searchParams.get("full") === "true";
    const authResult = await requireApiAuth({
      requiredPermission: full
        ? "workflow-definitions.read_full"
        : "workflow-definitions.read",
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { orgId } = authResult.context;

    if (full) {
      const definitions = await db
        .select()
        .from(workflowDefinitions)
        .where(
          and(
            eq(workflowDefinitions.orgId, orgId),
            eq(workflowDefinitions.isActive, true)
          )
        );

      return NextResponse.json({ definitions });
    }

    // Lightweight response for pickers (includes statuses for dynamic UI)
    const definitions = await db
      .select({
        id: workflowDefinitions.id,
        name: workflowDefinitions.name,
        description: workflowDefinitions.description,
        version: workflowDefinitions.version,
        statuses: workflowDefinitions.statuses,
      })
      .from(workflowDefinitions)
      .where(
        and(
          eq(workflowDefinitions.orgId, orgId),
          eq(workflowDefinitions.isActive, true)
        )
      );

    const runStats = await db
      .select({
        workflowDefinitionId: workflowExecutions.workflowDefinitionId,
        runCount: count(),
        lastRunAt: sql<Date | string | null>`max(${workflowExecutions.startedAt})`.as("lastRunAt"),
      })
      .from(workflowExecutions)
      .where(
        and(
          eq(workflowExecutions.orgId, orgId),
          isNotNull(workflowExecutions.workflowDefinitionId)
        )
      )
      .groupBy(workflowExecutions.workflowDefinitionId);

    const runStatsByDefinitionId = new Map(
      runStats.map((stat) => [
        stat.workflowDefinitionId,
        {
          runCount: Number(stat.runCount ?? 0),
          lastRunAt: toIsoTimestamp(stat.lastRunAt),
        },
      ])
    );

    return NextResponse.json({
      definitions: definitions.map((definition) => {
        const stats = runStatsByDefinitionId.get(definition.id);
        return {
          ...definition,
          runCount: stats?.runCount ?? 0,
          lastRunAt: stats?.lastRunAt ?? null,
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching workflow definitions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch workflow definitions",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflow-definitions
 *
 * Creates a new workflow definition.
 *
 * Request body:
 * {
 *   "name": "string" (required),
 *   "description": "string" (optional),
 *   "statuses": DefinitionStatus[] (optional),
 *   "sourceDefinitionId": "string" (optional, duplicates from source definition)
 * }
 */
async function POSTHandler(req: Request) {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "workflow-definitions.write",
    });

    if (!authResult.ok) {
      return authResult.response;
    }
    const { orgId } = authResult.context;

    const body = await req.json();
    const { name, description, statuses, sourceDefinitionId } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return NextResponse.json(
        { error: "description must be a string when provided" },
        { status: 400 }
      );
    }

    if (
      sourceDefinitionId !== undefined &&
      (typeof sourceDefinitionId !== "string" || !sourceDefinitionId.trim())
    ) {
      return NextResponse.json(
        { error: "sourceDefinitionId must be a non-empty string when provided" },
        { status: 400 }
      );
    }

    if (body.steps !== undefined) {
      return NextResponse.json(
        {
          error:
            "direct steps writes are not supported; use authoring payload through the workflow builder editor",
        },
        { status: 400 }
      );
    }

    const normalizedName = name.trim();
    const normalizedDescription =
      description === null
        ? null
        : typeof description === "string"
          ? description.trim() || null
          : undefined;

    if (typeof sourceDefinitionId === "string" && sourceDefinitionId.trim().length > 0) {
      const [sourceDefinition] = await db
        .select()
        .from(workflowDefinitions)
        .where(
          and(
            eq(workflowDefinitions.id, sourceDefinitionId.trim()),
            eq(workflowDefinitions.orgId, orgId),
            eq(workflowDefinitions.isActive, true)
          )
        );

      if (!sourceDefinition) {
        return NextResponse.json(
          { error: "Source workflow definition not found" },
          { status: 404 }
        );
      }

      const statusesResult = normalizeDefinitionStatuses(
        statuses !== undefined ? statuses : sourceDefinition.statuses
      );
      if (!statusesResult.ok) {
        return NextResponse.json({ error: statusesResult.error }, { status: 400 });
      }

      const [definition] = await db
        .insert(workflowDefinitions)
        .values({
          orgId,
          name: normalizedName,
          description:
            normalizedDescription !== undefined
              ? normalizedDescription
              : sourceDefinition.description,
          version: 1,
          phases: sourceDefinition.phases,
          steps: sourceDefinition.steps,
          statuses: statusesResult.statuses,
          variables: sourceDefinition.variables,
          isActive: true,
        })
        .returning();

      return NextResponse.json({ definition }, { status: 201 });
    }

    const statusesResult = normalizeDefinitionStatuses(statuses);
    if (!statusesResult.ok) {
      return NextResponse.json({ error: statusesResult.error }, { status: 400 });
    }

    const now = new Date().toISOString();
    const authoring: WorkflowDefinitionV2 = {
      id: "pending",
      name: normalizedName,
      description: normalizedDescription ?? undefined,
      trigger: { type: "manual" },
      contactRequired: true,
      steps: [],
      phases: [],
      statuses: statusesResult.statuses,
      variables: [],
      createdAt: now,
      updatedAt: now,
    };

    const compiledSteps = compileAuthoringToRuntime(authoring, {
      definitionStatuses: statusesResult.statuses,
    });

    const [definition] = await db
      .insert(workflowDefinitions)
      .values({
        orgId,
        name: normalizedName,
        description: normalizedDescription ?? null,
        version: 1,
        steps: compiledSteps,
        statuses: statusesResult.statuses,
        variables: persistableAuthoringPayload(authoring),
        isActive: true,
      })
      .returning();

    return NextResponse.json({ definition }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthoringCompileError) {
      const compileError = error;
      return NextResponse.json(
        {
          error: "Authoring validation failed",
          details: compileError.issues.map(
            (issue) => `${issue.path}: ${issue.message}`
          ),
        },
        { status: 400 }
      );
    }

    console.error("Error creating workflow definition:", error);
    return NextResponse.json(
      {
        error: "Failed to create workflow definition",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export const GET = withApiRequestLogging(GETHandler);
export const POST = withApiRequestLogging(POSTHandler);
