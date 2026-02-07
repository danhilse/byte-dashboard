import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTemporalClient } from "@/lib/temporal/client";
import { db } from "@/lib/db";
import { tasks, workflows } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { TaskCompletedSignal } from "@/lib/workflows/applicant-review-workflow";

/**
 * PATCH /api/tasks/[id]/status
 *
 * Updates a task's status and conditionally signals the workflow
 *
 * Request body:
 * {
 *   "status": "todo" | "in_progress" | "done"
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
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !["todo", "in_progress", "done"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get the task
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.orgId !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update task status
    const now = new Date();
    await db
      .update(tasks)
      .set({
        status,
        completedAt: status === "done" ? now : null,
        updatedAt: now,
      })
      .where(eq(tasks.id, taskId));

    let workflowSignaled = false;

    // If task is done and associated with a workflow, signal the workflow
    if (status === "done" && task.workflowId) {
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

          // Send taskCompleted signal
          const signal: TaskCompletedSignal = {
            taskId,
            completedBy: userId,
          };

          await handle.signal("taskCompleted", signal);
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
    }

    return NextResponse.json({
      taskId,
      status,
      workflowSignaled,
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
