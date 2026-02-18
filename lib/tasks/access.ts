import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { organizationMemberships } from "@/lib/db/schema";

type NullableString = string | null | undefined;

export interface TaskAccessTarget {
  assignedTo: NullableString;
  assignedRole?: NullableString;
}

export interface TaskAccessContext {
  userId: string;
  orgId: string;
  orgRole: string | null;
  roles: Set<string>;
  hasAdminAccess: boolean;
}

interface BuildTaskAccessContextParams {
  userId: string;
  orgId: string;
  orgRole?: string | null;
  hasAdminAccess?: boolean;
}

export function normalizeRoleName(role: NullableString): string | null {
  if (!role) return null;
  const normalized = role.trim().toLowerCase().replace(/^org:/, "");
  return normalized.length > 0 ? normalized : null;
}

export async function buildTaskAccessContext({
  userId,
  orgId,
  orgRole,
  hasAdminAccess = false,
}: BuildTaskAccessContextParams): Promise<TaskAccessContext> {
  const normalizedOrgRole = normalizeRoleName(orgRole);

  const [userRecord] = await db
    .select({
      role: organizationMemberships.role,
      roles: organizationMemberships.roles,
    })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.orgId, orgId)
      )
    )
    .limit(1);

  const roles = new Set<string>();

  const primaryRole = normalizeRoleName(userRecord?.role);
  if (primaryRole) roles.add(primaryRole);

  for (const role of userRecord?.roles ?? []) {
    const normalized = normalizeRoleName(role);
    if (normalized) roles.add(normalized);
  }

  if (normalizedOrgRole) {
    roles.add(normalizedOrgRole);
  }

  // Pragmatic defaults for common flows:
  // - org admins can service role-assigned work
  // - org members can service reviewer work
  if (hasAdminAccess || normalizedOrgRole === "admin") {
    roles.add("manager");
    roles.add("reviewer");
    roles.add("member");
    roles.add("user");
  }

  if (normalizedOrgRole === "member") {
    roles.add("reviewer");
    roles.add("user");
  }

  if (roles.has("manager")) {
    roles.add("reviewer");
  }

  return {
    userId,
    orgId,
    orgRole: normalizedOrgRole,
    roles,
    hasAdminAccess,
  };
}

export function canAccessAssignedRole(
  context: TaskAccessContext,
  assignedRole: NullableString
): boolean {
  const normalizedAssignedRole = normalizeRoleName(assignedRole);
  if (!normalizedAssignedRole) return false;

  if (context.hasAdminAccess) {
    return true;
  }

  return context.roles.has(normalizedAssignedRole);
}

export function canMutateTask(
  context: TaskAccessContext,
  task: TaskAccessTarget
): boolean {
  if (context.hasAdminAccess) return true;
  return task.assignedTo === context.userId;
}

export function canClaimTask(
  context: TaskAccessContext,
  task: TaskAccessTarget
): boolean {
  return !task.assignedTo && canAccessAssignedRole(context, task.assignedRole);
}
