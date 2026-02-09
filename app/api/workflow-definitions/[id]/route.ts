import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workflowDefinitions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { DefinitionStatus } from "@/types";
import {
  AuthoringCompileError,
  compileAuthoringToRuntime,
  fromDefinitionToAuthoring,
  hasPersistedAuthoringPayload,
  type DefinitionRecordLike,
} from "@/lib/workflow-builder-v2/adapters/definition-runtime-adapter";

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
 * GET /api/workflow-definitions/:id
 *
 * Gets a single workflow definition by ID (org-scoped).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [definition] = await db
      .select()
      .from(workflowDefinitions)
      .where(
        and(
          eq(workflowDefinitions.id, id),
          eq(workflowDefinitions.orgId, orgId)
        )
      );

    if (!definition) {
      return NextResponse.json(
        { error: "Workflow definition not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ definition });
  } catch (error) {
    console.error("Error fetching workflow definition:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch workflow definition",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workflow-definitions/:id
 *
 * Immutable versioning: clones the definition with a new UUID,
 * increments the version, applies updates, and deactivates the old row.
 * Running executions keep referencing the old version's UUID.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, steps, phases, variables, statuses } = body;

    if (statuses !== undefined && !isValidDefinitionStatuses(statuses)) {
      return NextResponse.json(
        { error: "statuses must be a valid DefinitionStatus[] when provided" },
        { status: 400 }
      );
    }

    const [existingDefinition] = await db
      .select()
      .from(workflowDefinitions)
      .where(
        and(
          eq(workflowDefinitions.id, id),
          eq(workflowDefinitions.orgId, orgId),
          eq(workflowDefinitions.isActive, true)
        )
      );

    if (!existingDefinition) {
      return NextResponse.json(
        { error: "Workflow definition not found" },
        { status: 404 }
      );
    }

    const resolvedStatuses = (statuses ??
      existingDefinition.statuses) as DefinitionStatus[];
    const resolvedVariables =
      variables !== undefined ? variables : existingDefinition.variables;

    let resolvedSteps = steps !== undefined ? steps : existingDefinition.steps;

    if (hasPersistedAuthoringPayload(resolvedVariables)) {
      const authoring = fromDefinitionToAuthoring({
        ...(existingDefinition as DefinitionRecordLike),
        id: existingDefinition.id,
        name: (name ?? existingDefinition.name) as string,
        description:
          description !== undefined
            ? (description as string | null)
            : existingDefinition.description,
        statuses: resolvedStatuses,
        variables: resolvedVariables,
        phases: phases !== undefined ? phases : existingDefinition.phases,
        steps: existingDefinition.steps,
        createdAt: existingDefinition.createdAt.toISOString(),
        updatedAt: existingDefinition.updatedAt.toISOString(),
      });

      resolvedSteps = compileAuthoringToRuntime(authoring, {
        definitionStatuses: resolvedStatuses,
      });
    }

    // Transactional clone + deactivate to avoid concurrent edit races.
    const newDefinition = await db.transaction(async (tx) => {
      const [deactivated] = await tx
        .update(workflowDefinitions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(workflowDefinitions.id, id),
            eq(workflowDefinitions.orgId, orgId),
            eq(workflowDefinitions.isActive, true)
          )
        )
        .returning();

      if (!deactivated) {
        return null;
      }

      const [created] = await tx
        .insert(workflowDefinitions)
        .values({
          orgId,
          name: name !== undefined ? name : existingDefinition.name,
          description:
            description !== undefined
              ? description
              : existingDefinition.description,
          version: existingDefinition.version + 1,
          steps: resolvedSteps,
          phases: phases !== undefined ? phases : existingDefinition.phases,
          variables: resolvedVariables,
          statuses: resolvedStatuses,
          isActive: true,
        })
        .returning();

      return created;
    });

    if (!newDefinition) {
      return NextResponse.json(
        { error: "Workflow definition not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ definition: newDefinition });
  } catch (error) {
    if (error instanceof AuthoringCompileError) {
      return NextResponse.json(
        {
          error: "Authoring validation failed",
          details: error.issues.map(
            (issue) => `${issue.path}: ${issue.message}`
          ),
        },
        { status: 400 }
      );
    }

    console.error("Error updating workflow definition:", error);
    return NextResponse.json(
      {
        error: "Failed to update workflow definition",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflow-definitions/:id
 *
 * Soft delete: sets isActive=false.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [definition] = await db
      .update(workflowDefinitions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(workflowDefinitions.id, id),
          eq(workflowDefinitions.orgId, orgId)
        )
      )
      .returning();

    if (!definition) {
      return NextResponse.json(
        { error: "Workflow definition not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, definition });
  } catch (error) {
    console.error("Error deleting workflow definition:", error);
    return NextResponse.json(
      {
        error: "Failed to delete workflow definition",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
