import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTemporalClient } from "@/lib/temporal/client";
import { db } from "@/lib/db";
import { tasks, workflows } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";
import type { ApprovalSignal } from "@/lib/workflows/applicant-review-workflow";
import { buildTaskAccessContext, canMutateTask } from "@/lib/tasks/access";
import { requiresApprovalComment } from "@/lib/tasks/approval-requirements";
import { logActivity } from "@/lib/db/log-activity";

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
    const { userId, orgId, orgRole } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { comment } = body;
    const normalizedComment =
      typeof comment === "string" ? comment.trim() : undefined;

    if (comment !== undefined && typeof comment !== "string") {
      return NextResponse.json(
        { error: "comment must be a string when provided" },
        { status: 400 }
      );
    }

    // Scope by org to avoid leaking resource existence across tenants
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.orgId, orgId)));

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const access = await buildTaskAccessContext({ userId, orgId, orgRole });
    if (!canMutateTask(access, task)) {
      return NextResponse.json(
        { error: "You do not have permission to approve this task" },
        { status: 403 }
      );
    }

    if (task.taskType !== "approval") {
      return NextResponse.json(
        { error: "Task is not an approval task" },
        { status: 400 }
      );
    }

    const commentRequired = await requiresApprovalComment({
      orgId,
      workflowId: task.workflowId,
    });

    if (commentRequired && !normalizedComment) {
      return NextResponse.json(
        { error: "A comment is required for this approval step" },
        { status: 400 }
      );
    }

    // Atomically transition from non-done -> done to avoid concurrent approve/reject races
    const now = new Date();
    const [updatedTask] = await db
      .update(tasks)
      .set({
        status: "done",
        outcome: "approved",
        outcomeComment: normalizedComment,
        completedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.orgId, orgId),
          eq(tasks.taskType, "approval"),
          ne(tasks.status, "done")
        )
      )
      .returning();

    if (!updatedTask) {
      const [latestTask] = await db
        .select({
          status: tasks.status,
          outcome: tasks.outcome,
          taskType: tasks.taskType,
        })
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.orgId, orgId)));

      if (!latestTask) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      if (latestTask.taskType !== "approval") {
        return NextResponse.json(
          { error: "Task is not an approval task" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Task already completed", outcome: latestTask.outcome },
        { status: 409 }
      );
    }

    let workflowSignaled = false;

    // Signal the workflow if associated
    if (updatedTask.workflowId) {
      try {
        // Get workflow execution to find Temporal workflow ID
        const [workflowExecution] = await db
          .select()
          .from(workflows)
          .where(
            and(
              eq(workflows.id, updatedTask.workflowId),
              eq(workflows.orgId, orgId)
            )
          );

        if (workflowExecution && workflowExecution.temporalWorkflowId) {
          const client = await getTemporalClient();
          const handle = client.workflow.getHandle(
            workflowExecution.temporalWorkflowId
          );

          // Send approvalSubmitted signal
          const signal: ApprovalSignal = {
            outcome: "approved",
            comment: normalizedComment,
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

    await logActivity({
      orgId,
      userId,
      entityType: "task",
      entityId: taskId,
      action: "status_changed",
      details: { outcome: "approved", comment: normalizedComment },
    });

    return NextResponse.json({
      taskId,
      outcome: "approved",
      comment: normalizedComment,
      workflowSignaled,
      task: updatedTask,
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
