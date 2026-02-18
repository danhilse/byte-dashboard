import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { tasks, contacts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  buildTaskAccessContext,
  canClaimTask,
  canMutateTask,
} from "@/lib/tasks/access";
import { logActivity } from "@/lib/db/log-activity";
import { createTaskAssignedNotification } from "@/lib/notifications/service";
import { normalizeTaskMetadata } from "@/lib/tasks/presentation";
import { isUserInOrganization } from "@/lib/users/service";
import { validateTaskPayload } from "@/lib/validation/rules";
import { parseJsonBody, validationErrorResponse } from "@/lib/validation/api-helpers";

/**
 * GET /api/tasks/:id
 *
 * Gets a single task by ID with contact info.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "tasks.read",
    });
    const { id } = await params;

    if (!authResult.ok) {
      return authResult.response;
    }
    const { userId, orgId, orgRole } = authResult.context;

    const rows = await db
      .select({
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
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
      })
      .from(tasks)
      .leftJoin(contacts, eq(tasks.contactId, contacts.id))
      .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)));

    if (rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { contactFirstName, contactLastName, ...task } = rows[0];
    const access = await buildTaskAccessContext({ userId, orgId, orgRole });

    if (!canMutateTask(access, task) && !canClaimTask(access, task)) {
      return NextResponse.json(
        { error: "You do not have permission to access this task" },
        { status: 403 }
      );
    }

    const contactName =
      contactFirstName || contactLastName
        ? `${contactFirstName ?? ""} ${contactLastName ?? ""}`.trim()
        : undefined;

    return NextResponse.json({ task: { ...task, contactName } });
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch task",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/:id
 *
 * Updates a task's fields (except status — use /status endpoint).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "tasks.write",
    });
    const { id } = await params;

    if (!authResult.ok) {
      return authResult.response;
    }
    const { userId, orgId, orgRole } = authResult.context;

    const result = await parseJsonBody(req);
    if ("error" in result) return result.error;
    const body = result.body;

    // Reject status updates — must use /api/tasks/[id]/status
    if (body.status !== undefined) {
      return NextResponse.json(
        {
          error:
            "Use PATCH /api/tasks/{id}/status to update status (ensures workflow signaling)",
        },
        { status: 400 }
      );
    }

    const validationErrors = validateTaskPayload(body, "update");
    if (validationErrors.length > 0) return validationErrorResponse(validationErrors);

    const {
      title,
      description,
      priority,
      assignedTo,
      assignedRole,
      contactId,
      dueDate,
      position,
      metadata,
    } = body;

    const access = await buildTaskAccessContext({ userId, orgId, orgRole });
    const [existingTask] = await db
      .select({
        id: tasks.id,
        assignedTo: tasks.assignedTo,
      })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)));

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!canMutateTask(access, existingTask)) {
      return NextResponse.json(
        { error: "You do not have permission to update this task" },
        { status: 403 }
      );
    }

    // Validate contactId belongs to org if provided
    if (contactId) {
      const [contact] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(eq(contacts.id, contactId as string), eq(contacts.orgId, orgId)));

      if (!contact) {
        return NextResponse.json(
          { error: "Contact not found" },
          { status: 404 }
        );
      }
    }

    if (assignedTo) {
      const isAssigneeInOrg = await isUserInOrganization(orgId, assignedTo as string);
      if (!isAssigneeInOrg) {
        return NextResponse.json(
          { error: "assignedTo must belong to the authenticated organization" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;
    if (assignedRole !== undefined) updateData.assignedRole = assignedRole || null;
    if (contactId !== undefined) updateData.contactId = contactId || null;
    if (dueDate !== undefined) updateData.dueDate = dueDate || null;
    if (position !== undefined) updateData.position = position;
    if (metadata !== undefined) updateData.metadata = normalizeTaskMetadata(metadata as Record<string, unknown> | undefined);

    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)))
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

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await logActivity({
      orgId,
      userId,
      entityType: "task",
      entityId: id,
      action: "updated",
    });

    if (task.assignedTo && task.assignedTo !== existingTask.assignedTo) {
      try {
        await createTaskAssignedNotification({
          orgId,
          userId: task.assignedTo,
          taskId: task.id,
          taskTitle: task.title,
          assignedByUserId: userId,
        });
      } catch (notificationError) {
        console.error("Failed to create task assignment notification:", notificationError);
      }
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      {
        error: "Failed to update task",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/:id
 *
 * Deletes a task.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "tasks.write",
    });
    const { id } = await params;

    if (!authResult.ok) {
      return authResult.response;
    }
    const { userId, orgId, orgRole } = authResult.context;

    const access = await buildTaskAccessContext({ userId, orgId, orgRole });
    const [existingTask] = await db
      .select({
        id: tasks.id,
        assignedTo: tasks.assignedTo,
      })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)));

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!canMutateTask(access, existingTask)) {
      return NextResponse.json(
        { error: "You do not have permission to delete this task" },
        { status: 403 }
      );
    }

    const [deletedTask] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)))
      .returning({
        id: tasks.id,
        title: tasks.title,
      });

    if (!deletedTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await logActivity({
      orgId,
      userId,
      entityType: "task",
      entityId: id,
      action: "deleted",
      details: { title: deletedTask.title },
    });

    return NextResponse.json({ success: true, task: deletedTask });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      {
        error: "Failed to delete task",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
