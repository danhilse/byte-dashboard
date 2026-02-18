import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/api-guard";
import { getTemporalClient } from "@/lib/temporal/client";
import { db } from "@/lib/db";
import { tasks, workflowExecutions } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";
import {
  APPROVAL_SUBMITTED_SIGNAL_NAME,
  TASK_COMPLETED_SIGNAL_NAME,
  type ApprovalSignal,
  type TaskCompletedSignal,
} from "@/lib/workflows/signal-types";
import { buildTaskAccessContext, canMutateTask } from "@/lib/tasks/access";
import { requiresApprovalComment } from "@/lib/tasks/approval-requirements";
import { logActivity } from "@/lib/db/log-activity";

/**
 * PATCH /api/tasks/[id]/reject
 *
 * Rejects an approval task and signals the workflow
 *
 * Request body:
 * {
 *   "comment": "string" (optional)
 * }
 *
 * Returns:
 * {
 *   "taskId": "uuid",
 *   "outcome": "rejected",
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
    const authResult = await requireApiAuth({
      requiredPermission: "tasks.write",
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { userId, orgId, orgRole, hasAdminAccess } = authResult.context;

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
      .select({
        id: tasks.id,
        orgId: tasks.orgId,
        workflowExecutionId: tasks.workflowExecutionId,
        assignedTo: tasks.assignedTo,
        assignedRole: tasks.assignedRole,
        taskType: tasks.taskType,
        status: tasks.status,
      })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.orgId, orgId)));

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const access = await buildTaskAccessContext({
      userId,
      orgId,
      orgRole,
      hasAdminAccess,
    });
    if (!canMutateTask(access, task)) {
      return NextResponse.json(
        { error: "You do not have permission to reject this task" },
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
      workflowExecutionId: (task as { workflowExecutionId?: string | null }).workflowExecutionId,
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
        outcome: "rejected",
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
      .returning({
        id: tasks.id,
        orgId: tasks.orgId,
        workflowExecutionId: tasks.workflowExecutionId,
        contactId: tasks.contactId,
        assignedTo: tasks.assignedTo,
        assignedRole: tasks.assignedRole,
        title: tasks.title,
        description: tasks.description,
        taskType: tasks.taskType,
        status: tasks.status,
        priority: tasks.priority,
        outcome: tasks.outcome,
        outcomeComment: tasks.outcomeComment,
        position: tasks.position,
        dueDate: tasks.dueDate,
        completedAt: tasks.completedAt,
        metadata: tasks.metadata,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      });

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
    const workflowExecutionId = (updatedTask as { workflowExecutionId?: string | null })
      .workflowExecutionId;

    if (workflowExecutionId) {
      try {
        // Get workflow execution to find Temporal workflow ID
        const [workflowExecution] = await db
          .select()
          .from(workflowExecutions)
          .where(
            and(
              eq(workflowExecutions.id, workflowExecutionId),
              eq(workflowExecutions.orgId, orgId)
            )
          );

        if (workflowExecution && workflowExecution.temporalWorkflowId) {
          const client = await getTemporalClient();
          const handle = client.workflow.getHandle(
            workflowExecution.temporalWorkflowId
          );

          const taskCompletedSignal: TaskCompletedSignal = {
            taskId,
            completedBy: userId,
          };

          const approvalSignal: ApprovalSignal = {
            outcome: "rejected",
            comment: normalizedComment,
            approvedBy: userId,
          };

          const [taskCompletedResult, approvalResult] = await Promise.allSettled([
            handle.signal(TASK_COMPLETED_SIGNAL_NAME, taskCompletedSignal),
            handle.signal(APPROVAL_SUBMITTED_SIGNAL_NAME, approvalSignal),
          ]);

          if (taskCompletedResult.status === "rejected") {
            console.error(
              `Failed signaling taskCompleted for workflow ${workflowExecution.temporalWorkflowId}:`,
              taskCompletedResult.reason
            );
          }

          if (approvalResult.status === "rejected") {
            console.error(
              `Failed signaling approvalSubmitted for workflow ${workflowExecution.temporalWorkflowId}:`,
              approvalResult.reason
            );
          }

          workflowSignaled =
            taskCompletedResult.status === "fulfilled" ||
            approvalResult.status === "fulfilled";

          if (workflowSignaled) {
            console.log(
              `Signaled workflow ${workflowExecution.temporalWorkflowId} with taskCompleted and approvalSubmitted (rejected)`
            );
          }
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
      details: { outcome: "rejected", comment: normalizedComment },
    });

    return NextResponse.json({
      taskId,
      outcome: "rejected",
      comment: normalizedComment,
      workflowSignaled,
      task: updatedTask,
    });
  } catch (error) {
    console.error("Error rejecting task:", error);
    return NextResponse.json(
      {
        error: "Failed to reject task",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
