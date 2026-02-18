import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, workflowDefinitions, workflowExecutions } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getTemporalClient } from "@/lib/temporal/client";
import { WorkflowNotFoundError } from "@temporalio/common";
import {
  AuthoringCompileError,
  compileAuthoringToRuntime,
  fromDefinitionToAuthoring,
  hasPersistedAuthoringPayload,
} from "@/lib/workflow-builder-v2/adapters/definition-runtime-adapter";
import { normalizeDefinitionStatuses } from "@/lib/workflow-builder-v2/status-guardrails";
import { requireApiAuth } from "@/lib/auth/api-guard";

interface DefinitionExecutionRecord {
  id: string;
  temporalWorkflowId: string | null;
  temporalRunId: string | null;
}

async function terminateDefinitionExecutions(
  executions: DefinitionExecutionRecord[]
): Promise<{ terminated: number; notFound: number }> {
  const temporalExecutions = executions.filter(
    (execution): execution is DefinitionExecutionRecord & {
      temporalWorkflowId: string;
    } => Boolean(execution.temporalWorkflowId)
  );

  if (temporalExecutions.length === 0) {
    return { terminated: 0, notFound: 0 };
  }

  const client = await getTemporalClient();
  let terminated = 0;
  let notFound = 0;

  for (const execution of temporalExecutions) {
    try {
      const handle = client.workflow.getHandle(execution.temporalWorkflowId);

      await handle.terminate("Workflow definition deleted from dashboard");
      terminated += 1;
    } catch (error) {
      if (error instanceof WorkflowNotFoundError) {
        // Already closed or outside retention window.
        notFound += 1;
        continue;
      }
      throw error;
    }
  }

  return { terminated, notFound };
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
    const authResult = await requireApiAuth({
      requiredPermission: "workflow-definitions.read",
    });
    const { id } = await params;

    if (!authResult.ok) {
      return authResult.response;
    }
    const { orgId } = authResult.context;

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
    const authResult = await requireApiAuth({
      requiredPermission: "workflow-definitions.write",
    });
    const { id } = await params;

    if (!authResult.ok) {
      return authResult.response;
    }
    const { orgId } = authResult.context;

    const body = await req.json();
    const { name, description, steps, phases, variables, statuses } = body;

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json(
        { error: "name must be a non-empty string when provided" },
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

    if (steps !== undefined) {
      return NextResponse.json(
        {
          error:
            "direct steps writes are not supported; use authoring payload through the workflow builder editor",
        },
        { status: 400 }
      );
    }

    const statusesResult = normalizeDefinitionStatuses(statuses);
    if (!statusesResult.ok) {
      return NextResponse.json(
        { error: statusesResult.error },
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

    const normalizedName =
      typeof name === "string" ? name.trim() : existingDefinition.name;
    const normalizedDescription =
      description === null
        ? null
        : typeof description === "string"
          ? description.trim() || null
          : undefined;

    const persistedStatusesResult = normalizeDefinitionStatuses(
      statuses ?? existingDefinition.statuses
    );
    if (!persistedStatusesResult.ok) {
      return NextResponse.json(
        { error: persistedStatusesResult.error },
        { status: 400 }
      );
    }

    const resolvedStatuses = persistedStatusesResult.statuses;
    const resolvedVariables =
      variables !== undefined ? variables : existingDefinition.variables;

    if (!hasPersistedAuthoringPayload(resolvedVariables)) {
      return NextResponse.json(
        {
          error:
            "authoring payload is required on variables.__builderV2Authoring for workflow definition saves",
        },
        { status: 400 }
      );
    }

    const authoring = fromDefinitionToAuthoring({
      id: existingDefinition.id,
      name: normalizedName ?? existingDefinition.name,
      description:
        normalizedDescription !== undefined
          ? normalizedDescription
          : existingDefinition.description,
      statuses: resolvedStatuses,
      variables: resolvedVariables,
      phases: phases !== undefined ? phases : existingDefinition.phases,
      steps: existingDefinition.steps,
      createdAt: existingDefinition.createdAt.toISOString(),
      updatedAt: existingDefinition.updatedAt.toISOString(),
    });

    const resolvedSteps = compileAuthoringToRuntime(authoring, {
      definitionStatuses: resolvedStatuses,
    });

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
          name: normalizedName ?? existingDefinition.name,
          description:
            normalizedDescription !== undefined
              ? normalizedDescription
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
 * Hard delete definition and all linked workflow executions/tasks.
 * Temporal-managed executions are terminated before DB deletion.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "workflow-definitions.write",
    });
    const { id } = await params;

    if (!authResult.ok) {
      return authResult.response;
    }
    const { orgId } = authResult.context;

    const [definition] = await db
      .select({
        id: workflowDefinitions.id,
        name: workflowDefinitions.name,
      })
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

    const executions = await db
      .select({
        id: workflowExecutions.id,
        temporalWorkflowId: workflowExecutions.temporalWorkflowId,
        temporalRunId: workflowExecutions.temporalRunId,
      })
      .from(workflowExecutions)
      .where(
        and(
          eq(workflowExecutions.orgId, orgId),
          eq(workflowExecutions.workflowDefinitionId, id)
        )
      );

    let temporalTerminated = 0;
    let temporalNotFound = 0;

    try {
      const temporalResult = await terminateDefinitionExecutions(executions);
      temporalTerminated = temporalResult.terminated;
      temporalNotFound = temporalResult.notFound;
    } catch (error) {
      console.error("Error terminating Temporal executions for definition:", error);
      return NextResponse.json(
        {
          error: "Failed to terminate Temporal executions",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 502 }
      );
    }

    const executionIds = executions.map((execution) => execution.id);

    const summary = await db.transaction(async (tx) => {
      let deletedTasks = 0;

      if (executionIds.length > 0) {
        const deletedTaskRows = await tx
          .delete(tasks)
          .where(
            and(
              eq(tasks.orgId, orgId),
              inArray(tasks.workflowExecutionId, executionIds)
            )
          )
          .returning({ id: tasks.id });

        deletedTasks = deletedTaskRows.length;
      }

      const deletedExecutionRows = await tx
        .delete(workflowExecutions)
        .where(
          and(
            eq(workflowExecutions.orgId, orgId),
            eq(workflowExecutions.workflowDefinitionId, id)
          )
        )
        .returning({ id: workflowExecutions.id });

      const [deletedDefinition] = await tx
        .delete(workflowDefinitions)
        .where(
          and(
            eq(workflowDefinitions.id, id),
            eq(workflowDefinitions.orgId, orgId)
          )
        )
        .returning({ id: workflowDefinitions.id });

      if (!deletedDefinition) {
        throw new Error("Workflow definition disappeared during delete");
      }

      return {
        deletedTasks,
        deletedExecutions: deletedExecutionRows.length,
      };
    });

    return NextResponse.json({
      success: true,
      definition: {
        id: definition.id,
        name: definition.name,
      },
      deletedTasks: summary.deletedTasks,
      deletedExecutions: summary.deletedExecutions,
      temporalTerminated,
      temporalNotFound,
    });
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
