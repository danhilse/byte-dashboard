import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workflows, contacts, workflowDefinitions, tasks } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

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
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [result] = await db
      .select({
        workflow: workflows,
        contact: contacts,
        definitionName: workflowDefinitions.name,
      })
      .from(workflows)
      .leftJoin(contacts, eq(workflows.contactId, contacts.id))
      .leftJoin(
        workflowDefinitions,
        eq(workflows.workflowDefinitionId, workflowDefinitions.id)
      )
      .where(and(eq(workflows.id, id), eq(workflows.orgId, orgId)));

    if (!result) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    const contactName = result.contact
      ? `${result.contact.firstName ?? ""} ${result.contact.lastName ?? ""}`.trim()
      : undefined;

    return NextResponse.json({
      ...result.workflow,
      contact: result.contact,
      contactName,
      contactAvatarUrl: result.contact?.avatarUrl ?? undefined,
      definitionName: result.definitionName ?? undefined,
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
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      status,
      currentStepId,
      currentPhaseId,
      variables,
      metadata,
      completedAt,
    } = body;

    const [existingWorkflow] = await db
      .select({
        id: workflows.id,
        temporalWorkflowId: workflows.temporalWorkflowId,
      })
      .from(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.orgId, orgId)));

    if (!existingWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Temporal-managed workflows must derive status from workflow signals/activities.
    if (status !== undefined && existingWorkflow.temporalWorkflowId) {
      return NextResponse.json(
        {
          error:
            "Status for Temporal-managed workflows cannot be changed directly. Signal the workflow instead.",
        },
        { status: 409 }
      );
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (status !== undefined) updateData.status = status;
    if (currentStepId !== undefined) updateData.currentStepId = currentStepId;
    if (currentPhaseId !== undefined) updateData.currentPhaseId = currentPhaseId;
    if (variables !== undefined) updateData.variables = variables;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (completedAt !== undefined)
      updateData.completedAt = completedAt ? new Date(completedAt) : null;

    const [workflow] = await db
      .update(workflows)
      .set(updateData)
      .where(and(eq(workflows.id, id), eq(workflows.orgId, orgId)))
      .returning();

    return NextResponse.json({ workflow });
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
 * NOTE: If workflow has a temporalWorkflowId, only the DB record is deleted.
 * TODO: Add Temporal workflow termination/cancellation when Temporal is integrated.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [existingWorkflow] = await db
      .select({ id: workflows.id })
      .from(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.orgId, orgId)));

    if (!existingWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    const [relatedTask] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.workflowId, id), eq(tasks.orgId, orgId)))
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

    await db
      .delete(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.orgId, orgId)));

    return NextResponse.json({ success: true });
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
