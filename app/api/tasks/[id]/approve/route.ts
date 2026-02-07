import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTemporalClient } from "@/lib/temporal/client";
import { db } from "@/lib/db";
import { tasks, workflows } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ApprovalSignal } from "@/lib/workflows/applicant-review-workflow";

/**
 * PATCH /api/tasks/[id]/approve
 *
 * Approves an approval task and signals the workflow
 *
 * Request body:
 * {
 *   "comment": "string" (optional)
 * }
 *
 * Returns:
 * {
 *   "taskId": "uuid",
 *   "outcome": "approved",
 *   "workflowSignaled": true
 * }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;

    // Get authenticated user and org
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { comment } = body;

    // Get the task
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.orgId !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (task.taskType !== "approval") {
      return NextResponse.json(
        { error: "Task is not an approval task" },
        { status: 400 }
      );
    }

    if (task.status === "done") {
      return NextResponse.json(
        { error: "Task already completed", outcome: task.outcome },
        { status: 409 }
      );
    }

    // Update task with approval outcome
    const now = new Date();
    await db
      .update(tasks)
      .set({
        status: "done",
        outcome: "approved",
        outcomeComment: comment,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(tasks.id, taskId));

    let workflowSignaled = false;

    // Signal the workflow if associated
    if (task.workflowId) {
      try {
        // Get workflow execution to find Temporal workflow ID
        const [workflowExecution] = await db
          .select()
          .from(workflows)
          .where(eq(workflows.id, task.workflowId));

        if (workflowExecution && workflowExecution.temporalWorkflowId) {
          const client = await getTemporalClient();
          const handle = client.workflow.getHandle(
            workflowExecution.temporalWorkflowId
          );

          // Send approvalSubmitted signal
          const signal: ApprovalSignal = {
            outcome: "approved",
            comment,
            approvedBy: userId,
          };

          await handle.signal("approvalSubmitted", signal);
          workflowSignaled = true;

          console.log(
            `Signaled workflow ${workflowExecution.temporalWorkflowId} with approvalSubmitted (approved)`
          );
        }
      } catch (error) {
        console.error("Error signaling workflow:", error);
        // Don't fail the request if signaling fails
      }
    }

    return NextResponse.json({
      taskId,
      outcome: "approved",
      comment,
      workflowSignaled,
    });
  } catch (error) {
    console.error("Error approving task:", error);
    return NextResponse.json(
      {
        error: "Failed to approve task",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
