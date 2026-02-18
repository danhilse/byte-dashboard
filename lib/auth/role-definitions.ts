import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { organizationRoleDefinitions } from "@/lib/db/schema";
import { type AuthPermission, AUTH_PERMISSIONS } from "@/lib/auth/permissions";
import { normalizeOrgRole } from "@/lib/auth/roles";

const PERMISSION_SET = new Set<AuthPermission>(AUTH_PERMISSIONS);

export interface OrganizationRoleDefinitionRecord {
  orgId: string;
  roleKey: string;
  displayName: string;
  permissions: AuthPermission[];
  isSystem: boolean;
}

function normalizePermission(permission: string): AuthPermission | null {
  return PERMISSION_SET.has(permission as AuthPermission)
    ? (permission as AuthPermission)
    : null;
}

function sanitizePermissions(permissions: string[]): AuthPermission[] {
  const normalized = new Set<AuthPermission>();

  for (const permission of permissions) {
    const parsed = normalizePermission(permission);
    if (parsed) {
      normalized.add(parsed);
    }
  }

  return [...normalized];
}

function normalizeRoleKey(value: string): string | null {
  return normalizeOrgRole(value);
}

export async function listOrganizationRoleDefinitions(
  orgId: string
): Promise<OrganizationRoleDefinitionRecord[]> {
  const rows = await db
    .select({
      orgId: organizationRoleDefinitions.orgId,
      roleKey: organizationRoleDefinitions.roleKey,
      displayName: organizationRoleDefinitions.displayName,
      permissions: organizationRoleDefinitions.permissions,
      isSystem: organizationRoleDefinitions.isSystem,
    })
    .from(organizationRoleDefinitions)
    .where(eq(organizationRoleDefinitions.orgId, orgId));

  return rows.flatMap((row) => {
    const roleKey = normalizeRoleKey(row.roleKey);
    if (!roleKey) {
      return [];
    }

    return [
      {
        orgId: row.orgId,
        roleKey,
        displayName: row.displayName,
        permissions: sanitizePermissions(row.permissions),
        isSystem: row.isSystem,
      },
    ];
  });
}

export async function getOrganizationRolePermissionMap(
  orgId: string
): Promise<Map<string, ReadonlySet<AuthPermission>>> {
  const definitions = await listOrganizationRoleDefinitions(orgId);
  const merged = new Map<string, Set<AuthPermission>>();

  for (const definition of definitions) {
    const current =
      merged.get(definition.roleKey) ?? new Set<AuthPermission>();
    for (const permission of definition.permissions) {
      current.add(permission);
    }
    merged.set(definition.roleKey, current);
  }

  return new Map(
    [...merged.entries()].map(([roleKey, permissions]) => [
      roleKey,
      permissions as ReadonlySet<AuthPermission>,
    ])
  );
}

interface UpsertOrganizationRoleDefinitionInput {
  orgId: string;
  roleKey: string;
  displayName: string;
  permissions: string[];
  isSystem?: boolean;
}

export async function upsertOrganizationRoleDefinition(
  input: UpsertOrganizationRoleDefinitionInput
): Promise<OrganizationRoleDefinitionRecord> {
  const roleKey = normalizeRoleKey(input.roleKey);
  if (!roleKey) {
    throw new Error("roleKey is required");
  }

  const displayName = input.displayName.trim();
  if (!displayName) {
    throw new Error("displayName is required");
  }

  const permissions = sanitizePermissions(input.permissions);

  await db
    .insert(organizationRoleDefinitions)
    .values({
      orgId: input.orgId,
      roleKey,
      displayName,
      permissions,
      isSystem: input.isSystem ?? false,
    })
    .onConflictDoUpdate({
      target: [organizationRoleDefinitions.orgId, organizationRoleDefinitions.roleKey],
      set: {
        displayName,
        permissions,
        isSystem: input.isSystem ?? false,
        updatedAt: new Date(),
      },
    });

  return {
    orgId: input.orgId,
    roleKey,
    displayName,
    permissions,
    isSystem: input.isSystem ?? false,
  };
}

export async function deleteOrganizationRoleDefinition(
  orgId: string,
  roleKeyInput: string
): Promise<void> {
  const roleKey = normalizeRoleKey(roleKeyInput);
  if (!roleKey) return;

  await db
    .delete(organizationRoleDefinitions)
    .where(
      and(
        eq(organizationRoleDefinitions.orgId, orgId),
        eq(organizationRoleDefinitions.roleKey, roleKey)
      )
    );
}
