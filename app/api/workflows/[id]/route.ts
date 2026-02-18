import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { workflowExecutions, contacts, workflowDefinitions, tasks } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { logActivity } from "@/lib/db/log-activity";
import { getTemporalClient } from "@/lib/temporal/client";
import { WorkflowNotFoundError } from "@temporalio/common";
import {
  getAllowedWorkflowStatuses,
  isAllowedWorkflowStatus,
} from "@/lib/workflow-status";
import type { DefinitionStatus, WorkflowExecutionState } from "@/types";
import {
  redactContactForRead,
  resolveContactFieldAccess,
} from "@/lib/auth/field-visibility";

const ALLOWED_WORKFLOW_EXECUTION_STATES: ReadonlySet<WorkflowExecutionState> =
  new Set(["running", "completed", "error", "timeout", "cancelled"]);

/**
 * GET /api/workflows/[id]
 *
 * Gets workflow execution details with joined contact and definition data.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireApiAuth({
      requiredPermission: "workflows.read",
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { orgId, orgRoles } = authResult.context;
    const fieldAccess = await resolveContactFieldAccess({ orgId, orgRoles });

    const [result] = await db
      .select({
        workflow: workflowExecutions,
        contact: contacts,
        definitionName: workflowDefinitions.name,
        definitionStatuses: workflowDefinitions.statuses,
      })
      .from(workflowExecutions)
      .leftJoin(
        contacts,
        and(
          eq(workflowExecutions.contactId, contacts.id),
          eq(contacts.orgId, orgId)
        )
      )
      .leftJoin(
        workflowDefinitions,
        and(
          eq(workflowExecutions.workflowDefinitionId, workflowDefinitions.id),
          eq(workflowDefinitions.orgId, orgId)
        )
      )
      .where(and(eq(workflowExecutions.id, id), eq(workflowExecutions.orgId, orgId)));

    if (!result) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    const redactedContact = result.contact
      ? redactContactForRead(result.contact, fieldAccess.readableFields)
      : null;
    const contactName = redactedContact
      ? `${redactedContact.firstName ?? ""} ${redactedContact.lastName ?? ""}`.trim() ||
        undefined
      : undefined;
    const workflowExecutionState =
      result.workflow.workflowExecutionState ??
      (result.workflow.completedAt ? "completed" : "running");

    return NextResponse.json({
      ...result.workflow,
      workflowExecutionState,
      contact: redactedContact,
      contactName,
      contactAvatarUrl: redactedContact?.avatarUrl ?? undefined,
      definitionName: result.definitionName ?? undefined,
      definitionStatuses:
        (result.definitionStatuses as DefinitionStatus[] | null) ?? undefined,
    });
  } catch (error) {
    console.error("Error getting workflow:", error);
    return NextResponse.json(
      {
        error: "Failed to get workflow",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workflows/[id]
 *
 * Partially updates a workflow execution.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireApiAuth({
      requiredPermission: "workflows.write",
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { userId, orgId } = authResult.context;

    const body = await req.json();
    const {
      status,
      workflowExecutionState,
      errorDefinition,
      currentStepId,
      currentPhaseId,
      variables,
      metadata,
      completedAt,
    } = body;

    const [existingWorkflow] = await db
      .select({
        id: workflowExecutions.id,
        temporalWorkflowId: workflowExecutions.temporalWorkflowId,
        workflowDefinitionId: workflowExecutions.workflowDefinitionId,
      })
      .from(workflowExecutions)
      .where(and(eq(workflowExecutions.id, id), eq(workflowExecutions.orgId, orgId)));

    if (!existingWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Temporal-managed workflows must derive status from workflow signals/activities.
    if (
      (status !== undefined || workflowExecutionState !== undefined) &&
      existingWorkflow.temporalWorkflowId
    ) {
      return NextResponse.json(
        {
          error:
            "Status/state for Temporal-managed workflows cannot be changed directly. Signal the workflow instead.",
        },
        { status: 409 }
      );
    }

    if (
      workflowExecutionState !== undefined &&
      !ALLOWED_WORKFLOW_EXECUTION_STATES.has(workflowExecutionState)
    ) {
      return NextResponse.json(
        {
          error: "Invalid workflow execution state",
          allowedStates: [...ALLOWED_WORKFLOW_EXECUTION_STATES],
        },
        { status: 400 }
      );
    }

    if (
      errorDefinition !== undefined &&
      errorDefinition !== null &&
      typeof errorDefinition !== "string"
    ) {
      return NextResponse.json(
        { error: "errorDefinition must be a string when provided" },
        { status: 400 }
      );
    }

    if (status !== undefined) {
      let definitionStatuses: DefinitionStatus[] | undefined;
      if (existingWorkflow.workflowDefinitionId) {
        const [definition] = await db
          .select({ statuses: workflowDefinitions.statuses })
          .from(workflowDefinitions)
          .where(
            and(
              eq(workflowDefinitions.id, existingWorkflow.workflowDefinitionId),
              eq(workflowDefinitions.orgId, orgId)
            )
          );

        definitionStatuses =
          (definition?.statuses as DefinitionStatus[] | null) ?? undefined;
      }

      if (!isAllowedWorkflowStatus(status, definitionStatuses)) {
        return NextResponse.json(
          {
            error: "Invalid workflow status for this workflow definition",
            allowedStatuses: getAllowedWorkflowStatuses(definitionStatuses),
          },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (status !== undefined) updateData.status = status;
    if (workflowExecutionState !== undefined)
      updateData.workflowExecutionState = workflowExecutionState;
    if (errorDefinition !== undefined) updateData.errorDefinition = errorDefinition || null;
    if (currentStepId !== undefined) updateData.currentStepId = currentStepId;
    if (currentPhaseId !== undefined) updateData.currentPhaseId = currentPhaseId;
    if (variables !== undefined) updateData.variables = variables;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (completedAt !== undefined)
      updateData.completedAt = completedAt ? new Date(completedAt) : null;

    const [workflow] = await db
      .update(workflowExecutions)
      .set(updateData)
      .where(and(eq(workflowExecutions.id, id), eq(workflowExecutions.orgId, orgId)))
      .returning();

    await logActivity({
      orgId,
      userId,
      entityType: "workflow",
      entityId: id,
      action:
        status !== undefined || workflowExecutionState !== undefined
          ? "status_changed"
          : "updated",
      details:
        status !== undefined || workflowExecutionState !== undefined
          ? {
              ...(status !== undefined ? { status } : {}),
              ...(workflowExecutionState !== undefined
                ? { workflowExecutionState }
                : {}),
            }
          : {},
    });

    return NextResponse.json({
      workflow: {
        ...workflow,
        workflowExecutionState:
          workflow.workflowExecutionState ??
          (workflow.completedAt ? "completed" : "running"),
      },
    });
  } catch (error) {
    console.error("Error updating workflow:", error);
    return NextResponse.json(
      {
        error: "Failed to update workflow",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflows/[id]
 *
 * Deletes a workflow execution by ID.
 * For Temporal-managed workflows, attempts to terminate the Temporal execution first.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireApiAuth({
      requiredPermission: "workflows.write",
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { userId, orgId } = authResult.context;

    const [existingWorkflow] = await db
      .select({
        id: workflowExecutions.id,
        temporalWorkflowId: workflowExecutions.temporalWorkflowId,
        temporalRunId: workflowExecutions.temporalRunId,
      })
      .from(workflowExecutions)
      .where(and(eq(workflowExecutions.id, id), eq(workflowExecutions.orgId, orgId)));

    if (!existingWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    const [relatedTask] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.workflowExecutionId, id), eq(tasks.orgId, orgId)))
      .limit(1);

    if (relatedTask) {
      return NextResponse.json(
        {
          error:
            "Workflow cannot be deleted while tasks are linked to it. Remove or reassign related tasks first.",
        },
        { status: 409 }
      );
    }

    let temporalTermination: "terminated" | "not_found" | "skipped" = "skipped";

    if (existingWorkflow.temporalWorkflowId) {
      try {
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(
          existingWorkflow.temporalWorkflowId
        );

        await handle.terminate("Deleted from dashboard");
        temporalTermination = "terminated";
      } catch (error) {
        if (error instanceof WorkflowNotFoundError) {
          // Execution is already closed, deleted by retention, or id/run pair is stale.
          temporalTermination = "not_found";
        } else {
          console.error("Error terminating Temporal workflow:", error);
          return NextResponse.json(
            {
              error: "Failed to terminate Temporal workflow",
              details: error instanceof Error ? error.message : String(error),
            },
            { status: 502 }
          );
        }
      }
    }

    await db
      .delete(workflowExecutions)
      .where(and(eq(workflowExecutions.id, id), eq(workflowExecutions.orgId, orgId)));

    await logActivity({
      orgId,
      userId,
      entityType: "workflow",
      entityId: id,
      action: "deleted",
      details: {
        temporalTermination,
        temporalWorkflowId: existingWorkflow.temporalWorkflowId ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      temporalTermination,
    });
  } catch (error) {
    console.error("Error deleting workflow:", error);
    return NextResponse.json(
      {
        error: "Failed to delete workflow",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
