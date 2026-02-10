import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { buildTaskAccessContext, canClaimTask } from "@/lib/tasks/access";
import { logActivity } from "@/lib/db/log-activity";

/**
 * PATCH /api/tasks/[id]/claim
 *
 * Atomically claims an unclaimed task for the authenticated user.
 * Uses a WHERE assignedTo IS NULL guard to prevent race conditions.
 *
 * Returns:
 *   200 - { task } on success
 *   404 - task not found
 *   409 - task already claimed by another user
 */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, orgId, orgRole } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await buildTaskAccessContext({ userId, orgId, orgRole });

    const [task] = await db
      .select({
        id: tasks.id,
        assignedTo: tasks.assignedTo,
        assignedRole: tasks.assignedRole,
      })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)));

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!task.assignedRole) {
      return NextResponse.json(
        { error: "Task is not role-assignable" },
        { status: 400 }
      );
    }

    if (task.assignedTo) {
      return NextResponse.json(
        { error: "Task already claimed by another user" },
        { status: 409 }
      );
    }

    if (!canClaimTask(access, task)) {
      return NextResponse.json(
        { error: "You do not have permission to claim this task" },
        { status: 403 }
      );
    }

    // Atomic claim: only succeeds if assignedTo is still NULL
    const [claimed] = await db
      .update(tasks)
      .set({ assignedTo: userId, updatedAt: new Date() })
      .where(
        and(
          eq(tasks.id, id),
          eq(tasks.orgId, orgId),
          isNull(tasks.assignedTo)
        )
      )
      .returning({
        id: tasks.id,
        orgId: tasks.orgId,
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

    if (!claimed) {
      // Differentiate between 404 (not found) and 409 (already claimed)
      const [existing] = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)));

      if (!existing) {
        return NextResponse.json(
          { error: "Task not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: "Task already claimed by another user" },
        { status: 409 }
      );
    }

    await logActivity({
      orgId,
      userId,
      entityType: "task",
      entityId: id,
      action: "updated",
      details: { action: "claimed" },
    });

    return NextResponse.json({ task: claimed });
  } catch (error) {
    console.error("Error claiming task:", error);
    return NextResponse.json(
      {
        error: "Failed to claim task",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
