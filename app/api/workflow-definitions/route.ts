import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workflowDefinitions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { DefinitionStatus } from "@/types";

function isValidDefinitionStatuses(
  value: unknown
): value is DefinitionStatus[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((status) => {
    if (!status || typeof status !== "object") {
      return false;
    }

    const candidate = status as Partial<DefinitionStatus>;
    const hasRequiredFields =
      typeof candidate.id === "string" &&
      candidate.id.trim().length > 0 &&
      typeof candidate.label === "string" &&
      candidate.label.trim().length > 0 &&
      typeof candidate.order === "number" &&
      Number.isInteger(candidate.order) &&
      candidate.order >= 0;

    if (!hasRequiredFields) {
      return false;
    }

    if (
      candidate.color !== undefined &&
      candidate.color !== null &&
      typeof candidate.color !== "string"
    ) {
      return false;
    }

    return true;
  });
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
export async function GET(req: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const full = searchParams.get("full") === "true";

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

    return NextResponse.json({ definitions });
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
 *   "steps": WorkflowStep[] (optional),
 *   "statuses": DefinitionStatus[] (optional)
 * }
 */
export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, steps, statuses } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    if (steps !== undefined && !Array.isArray(steps)) {
      return NextResponse.json(
        { error: "steps must be an array when provided" },
        { status: 400 }
      );
    }

    if (statuses !== undefined && !isValidDefinitionStatuses(statuses)) {
      return NextResponse.json(
        { error: "statuses must be a valid DefinitionStatus[] when provided" },
        { status: 400 }
      );
    }

    const normalizedStatuses = (statuses ?? []).map((status) => ({
      id: status.id.trim(),
      label: status.label.trim(),
      order: status.order,
      color: status.color?.trim() || undefined,
    }));

    const [definition] = await db
      .insert(workflowDefinitions)
      .values({
        orgId,
        name: name.trim(),
        description: description || null,
        version: 1,
        steps: steps ?? [],
        statuses: normalizedStatuses,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ definition }, { status: 201 });
  } catch (error) {
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
