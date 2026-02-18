import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { tasks, contacts, workflowExecutions } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import {
  buildTaskAccessContext,
  canClaimTask,
  canMutateTask,
  normalizeRoleName,
} from "@/lib/tasks/access";
import { logActivity } from "@/lib/db/log-activity";
import { createTaskAssignedNotification } from "@/lib/notifications/service";
import { normalizeTaskMetadata } from "@/lib/tasks/presentation";
import { isUserInOrganization } from "@/lib/users/service";
import { validateTaskPayload } from "@/lib/validation/rules";
import { parseJsonBody, validationErrorResponse } from "@/lib/validation/api-helpers";

/**
 * GET /api/tasks
 *
 * Lists tasks for the authenticated organization.
 * Query params:
 *   ?status=todo,in_progress - filter by status(es)
 *   ?assignee=me             - only tasks assigned to current user
 *   ?role=manager,reviewer   - filter by assigned role(s)
 *   ?available=true          - only unclaimed role-based tasks for current user
 */
export async function GET(req: Request) {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "tasks.read",
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { userId, orgId, orgRole } = authResult.context;

    const access = await buildTaskAccessContext({ userId, orgId, orgRole });

    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status");
    const assigneeParam = url.searchParams.get("assignee");
    const roleParam = url.searchParams.get("role");
    const availableParam = url.searchParams.get("available");
    const isAvailableView = availableParam === "true";

    if (assigneeParam && assigneeParam !== "me" && assigneeParam !== userId) {
      return NextResponse.json(
        { error: "assignee filter can only target the authenticated user" },
        { status: 403 }
      );
    }

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
      .where(eq(tasks.orgId, orgId))
      .orderBy(tasks.position, desc(tasks.createdAt));

    let result = rows.map(({ contactFirstName, contactLastName, ...task }) => {
      const contactName =
        contactFirstName || contactLastName
          ? `${contactFirstName ?? ""} ${contactLastName ?? ""}`.trim()
          : undefined;

      return {
        ...task,
        contactName,
      };
    });

    // Filter by status
    if (statusParam) {
      const statuses = statusParam.split(",").map((s) => s.trim());
      result = result.filter((t) => statuses.includes(t.status));
    }

    // Filter by role
    if (roleParam) {
      const requestedRoles = new Set(
        roleParam
          .split(",")
          .map((role) => normalizeRoleName(role))
          .filter((role): role is string => Boolean(role))
      );

      result = result.filter((t) => {
        const assignedRole = normalizeRoleName(t.assignedRole);
        return assignedRole ? requestedRoles.has(assignedRole) : false;
      });
    }

    if (isAvailableView) {
      // Available tasks are unclaimed role-based tasks the current user can claim.
      result = result.filter((t) => canClaimTask(access, t));
    } else {
      // Default My Work scope: tasks currently assigned to the current user.
      result = result.filter((t) => canMutateTask(access, t));
    }

    return NextResponse.json({ tasks: result });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tasks",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 *
 * Creates a new task.
 */
export async function POST(req: Request) {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "tasks.write",
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { userId, orgId } = authResult.context;

    const result = await parseJsonBody(req);
    if ("error" in result) return result.error;
    const body = result.body;

    const validationErrors = validateTaskPayload(body, "create");
    if (validationErrors.length > 0) return validationErrorResponse(validationErrors);

    const {
      title,
      description,
      status,
      priority,
      taskType,
      assignedTo,
      assignedRole,
      workflowExecutionId,
      contactId,
      dueDate,
      position,
      metadata,
    } = body;
    const resolvedAssignedTo = (assignedTo as string) || userId;

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

    // Validate workflowExecutionId belongs to org if provided
    if (workflowExecutionId) {
      const [workflow] = await db
        .select({ id: workflowExecutions.id })
        .from(workflowExecutions)
        .where(and(eq(workflowExecutions.id, workflowExecutionId as string), eq(workflowExecutions.orgId, orgId)));

      if (!workflow) {
        return NextResponse.json(
          { error: "Workflow not found" },
          { status: 404 }
        );
      }
    }

    if (resolvedAssignedTo) {
      const isAssigneeInOrg = await isUserInOrganization(orgId, resolvedAssignedTo);
      if (!isAssigneeInOrg) {
        return NextResponse.json(
          { error: "assignedTo must belong to the authenticated organization" },
          { status: 400 }
        );
      }
    }

    const [task] = await db
      .insert(tasks)
      .values({
        orgId,
        title: title as string,
        description: (description as string) || null,
        status: (status as string) || "todo",
        priority: (priority as string) || "medium",
        taskType: (taskType as string) || "standard",
        assignedTo: resolvedAssignedTo,
        assignedRole: (assignedRole as string) || null,
        contactId: (contactId as string) || null,
        dueDate: (dueDate as string) || null,
        position: (position as number) ?? 0,
        metadata: normalizeTaskMetadata(metadata as Record<string, unknown> | undefined),
        ...(workflowExecutionId ? { workflowExecutionId: workflowExecutionId as string } : {}),
      })
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
      })

    await logActivity({
      orgId,
      userId,
      entityType: "task",
      entityId: task.id,
      action: "created",
      details: { title: title as string },
    });

    if (task.assignedTo) {
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
    console.error("Error creating task:", error);
    return NextResponse.json(
      {
        error: "Failed to create task",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
