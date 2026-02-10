import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { normalizeRoleName } from "@/lib/tasks/access";
import type { WorkflowNotificationRecipients } from "@/types";
import { getOrganizationUsers, type OrganizationUserRecord } from "@/lib/users/service";

type NotificationType = "task_assigned" | "workflow_notification";

interface CreateNotificationsInput {
  orgId: string;
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

function normalizeNotificationText(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function getUserRoleSet(user: OrganizationUserRecord): Set<string> {
  const roles = new Set<string>();
  const primaryRole = normalizeRoleName(user.role);
  if (primaryRole) {
    roles.add(primaryRole);
  }

  for (const role of user.roles ?? []) {
    const normalized = normalizeRoleName(role);
    if (normalized) {
      roles.add(normalized);
    }
  }

  return roles;
}

async function resolveRecipientUserIds(
  orgId: string,
  recipients: WorkflowNotificationRecipients
): Promise<string[]> {
  const orgUsers = await getOrganizationUsers(orgId, {
    syncFromClerkOnEmpty: true,
  });

  if (recipients.type === "organization") {
    return orgUsers.map((user) => user.id);
  }

  if (recipients.type === "user") {
    const value = recipients.userId.trim();
    if (!value) return [];

    if (value.includes("@")) {
      const lower = value.toLowerCase();
      return orgUsers
        .filter((user) => user.email.toLowerCase() === lower)
        .map((user) => user.id);
    }

    return orgUsers
      .filter((user) => user.id === value)
      .map((user) => user.id);
  }

  if (recipients.type === "role") {
    const targetRole = normalizeRoleName(recipients.role);
    if (!targetRole) return [];

    return orgUsers
      .filter((user) => getUserRoleSet(user).has(targetRole))
      .map((user) => user.id);
  }

  const targetGroups = recipients.groupIds
    .map((groupId) => normalizeRoleName(groupId))
    .filter((groupId): groupId is string => Boolean(groupId));

  if (!targetGroups.length) return [];

  return orgUsers
    .filter((user) => {
      const userRoles = getUserRoleSet(user);
      return targetGroups.some((groupId) => userRoles.has(groupId));
    })
    .map((user) => user.id);
}

export async function createNotificationsForUsers({
  orgId,
  userIds,
  type,
  title,
  message,
  entityType,
  entityId,
  metadata = {},
}: CreateNotificationsInput): Promise<number> {
  const dedupedUserIds = [...new Set(userIds.filter(Boolean))];
  if (!dedupedUserIds.length) {
    return 0;
  }

  const safeTitle = normalizeNotificationText(title, "Notification");
  const safeMessage = normalizeNotificationText(
    message,
    "You have a new notification."
  );
  const now = new Date();

  await db.insert(notifications).values(
    dedupedUserIds.map((userId) => ({
      orgId,
      userId,
      type,
      title: safeTitle,
      message: safeMessage,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      metadata,
      createdAt: now,
      updatedAt: now,
    }))
  );

  return dedupedUserIds.length;
}

export async function createTaskAssignedNotification(input: {
  orgId: string;
  userId?: string | null;
  taskId: string;
  taskTitle: string;
  assignedByUserId?: string | null;
}): Promise<void> {
  if (!input.userId) {
    return;
  }

  if (input.assignedByUserId && input.assignedByUserId === input.userId) {
    return;
  }

  await createNotificationsForUsers({
    orgId: input.orgId,
    userIds: [input.userId],
    type: "task_assigned",
    title: "New task assigned",
    message: `You were assigned: ${input.taskTitle}`,
    entityType: "task",
    entityId: input.taskId,
    metadata: {
      taskId: input.taskId,
      taskTitle: input.taskTitle,
      assignedByUserId: input.assignedByUserId ?? null,
    },
  });
}

export async function createWorkflowActionNotifications(input: {
  orgId: string;
  workflowExecutionId: string;
  recipients: WorkflowNotificationRecipients;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<number> {
  const recipientUserIds = await resolveRecipientUserIds(
    input.orgId,
    input.recipients
  );

  if (!recipientUserIds.length) {
    return 0;
  }

  return createNotificationsForUsers({
    orgId: input.orgId,
    userIds: recipientUserIds,
    type: "workflow_notification",
    title: input.title,
    message: input.message,
    entityType: "workflow_execution",
    entityId: input.workflowExecutionId,
    metadata: input.metadata,
  });
}

export async function getNotificationsForUser(input: {
  orgId: string;
  userId: string;
  limit?: number;
}) {
  const limit = Math.max(1, Math.min(input.limit ?? 20, 50));

  const [items, [unread]] = await Promise.all([
    db
      .select({
        id: notifications.id,
        orgId: notifications.orgId,
        userId: notifications.userId,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        entityType: notifications.entityType,
        entityId: notifications.entityId,
        isRead: notifications.isRead,
        readAt: notifications.readAt,
        metadata: notifications.metadata,
        createdAt: notifications.createdAt,
        updatedAt: notifications.updatedAt,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.orgId, input.orgId),
          eq(notifications.userId, input.userId)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit),
    db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.orgId, input.orgId),
          eq(notifications.userId, input.userId),
          eq(notifications.isRead, false)
        )
      ),
  ]);

  return {
    notifications: items.map((item) => ({
      ...item,
      readAt: item.readAt ? item.readAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    unreadCount: Number(unread.count ?? 0),
  };
}

export async function markAllNotificationsRead(input: {
  orgId: string;
  userId: string;
}): Promise<number> {
  const now = new Date();
  const updated = await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(notifications.orgId, input.orgId),
        eq(notifications.userId, input.userId),
        eq(notifications.isRead, false)
      )
    )
    .returning({ id: notifications.id });

  return updated.length;
}

export async function markNotificationRead(input: {
  orgId: string;
  userId: string;
  notificationId: string;
}): Promise<boolean> {
  const now = new Date();
  const [updated] = await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(notifications.id, input.notificationId),
        eq(notifications.orgId, input.orgId),
        eq(notifications.userId, input.userId),
        eq(notifications.isRead, false)
      )
    )
    .returning({ id: notifications.id });

  if (updated) {
    return true;
  }

  const [existing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.id, input.notificationId),
        eq(notifications.orgId, input.orgId),
        eq(notifications.userId, input.userId)
      )
    )
    .limit(1);

  return Boolean(existing);
}
