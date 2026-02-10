import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTemporalClient } from "@/lib/temporal/client";
import { db } from "@/lib/db";
import { tasks, workflowExecutions } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";
import {
  TASK_COMPLETED_SIGNAL_NAME,
  type TaskCompletedSignal,
} from "@/lib/workflows/signal-types";
import { buildTaskAccessContext, canMutateTask } from "@/lib/tasks/access";
import { logActivity } from "@/lib/db/log-activity";

/**
 * PATCH /api/tasks/[id]/status
 *
 * Updates a task's status and conditionally signals the workflow
 *
 * Request body:
 * {
 *   "status": "backlog" | "todo" | "in_progress" | "done"
 * }
 *
 * Returns:
 * {
 *   "taskId": "uuid",
 *   "status": "done",
 *   "workflowSignaled": true | false
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
    const { status } = body;

    if (!status || !["backlog", "todo", "in_progress", "done"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
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

    const access = await buildTaskAccessContext({ userId, orgId, orgRole });
    if (!canMutateTask(access, task)) {
      return NextResponse.json(
        { error: "You do not have permission to update this task" },
        { status: 403 }
      );
    }

    // Approval tasks must be completed via /approve or /reject to preserve outcome semantics
    if (task.taskType === "approval" && status === "done") {
      return NextResponse.json(
        {
          error:
            "Approval tasks cannot be marked done via /status. Use /approve or /reject.",
        },
        { status: 400 }
      );
    }

    let workflowSignaled = false;

    // Handle completion as an idempotent transition to prevent duplicate signals
    if (status === "done") {
      const now = new Date();
      const [updatedTask] = await db
        .update(tasks)
        .set({
          status,
          completedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(tasks.id, taskId),
            eq(tasks.orgId, orgId),
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

      // Already complete (or completed concurrently): return idempotent success
      if (!updatedTask) {
        const [latestTask] = await db
          .select({
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
          })
          .from(tasks)
          .where(and(eq(tasks.id, taskId), eq(tasks.orgId, orgId)));

        return NextResponse.json({
          taskId,
          status,
          workflowSignaled,
          task: latestTask ?? task,
        });
      }

      // If task is associated with a workflow, signal the workflow
      const workflowExecutionId = (updatedTask as { workflowExecutionId?: string | null })
        .workflowExecutionId;

      if (!workflowExecutionId) {
        return NextResponse.json({
          taskId,
          status,
          workflowSignaled,
          task: updatedTask,
        });
      }

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

          // Send taskCompleted signal
          const signal: TaskCompletedSignal = {
            taskId,
            completedBy: userId,
          };

          await handle.signal(TASK_COMPLETED_SIGNAL_NAME, signal);
          workflowSignaled = true;

          console.log(
            `Signaled workflow ${workflowExecution.temporalWorkflowId} with taskCompleted`
          );
        }
      } catch (error) {
        console.error("Error signaling workflow:", error);
        // Don't fail the request if signaling fails
        // Task status is already updated
      }

      await logActivity({
        orgId,
        userId,
        entityType: "task",
        entityId: taskId,
        action: "status_changed",
        details: { from: task.status, to: status },
      });

      return NextResponse.json({
        taskId,
        status,
        workflowSignaled,
        task: updatedTask,
      });
    }

    // Non-terminal state updates
    const now = new Date();
    const [nonTerminalTask] = await db
      .update(tasks)
      .set({
        status,
        completedAt: null,
        updatedAt: now,
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.orgId, orgId)))
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

    await logActivity({
      orgId,
      userId,
      entityType: "task",
      entityId: taskId,
      action: "status_changed",
      details: { from: task.status, to: status },
    });

    return NextResponse.json({
      taskId,
      status,
      workflowSignaled,
      task: nonTerminalTask,
    });
  } catch (error) {
    console.error("Error updating task status:", error);
    return NextResponse.json(
      {
        error: "Failed to update task status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
