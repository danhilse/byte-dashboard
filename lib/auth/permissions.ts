import { normalizeOrgRole } from "@/lib/auth/roles";

type NullableString = string | null | undefined;

export const AUTH_PERMISSIONS = [
  "admin.access",
  "activity.read",
  "contacts.read",
  "contacts.write",
  "dashboard.read",
  "notes.read",
  "notes.write",
  "notifications.read",
  "notifications.write",
  "tasks.read",
  "tasks.write",
  "tasks.claim",
  "users.read",
  "workflow-definitions.read",
  "workflow-definitions.read_full",
  "workflow-definitions.write",
  "workflows.read",
  "workflows.write",
  "workflows.trigger",
] as const;

export type AuthPermission = (typeof AUTH_PERMISSIONS)[number];
export type BaseOrgRole = "owner" | "admin" | "member" | "user" | "guest";

const MEMBER_PERMISSIONS: readonly AuthPermission[] = [
  "activity.read",
  "contacts.read",
  "contacts.write",
  "dashboard.read",
  "notes.read",
  "notes.write",
  "notifications.read",
  "notifications.write",
  "tasks.read",
  "tasks.write",
  "tasks.claim",
  "users.read",
  "workflow-definitions.read",
  "workflows.read",
  "workflows.write",
  "workflows.trigger",
];

const GUEST_PERMISSIONS: readonly AuthPermission[] = [
  "activity.read",
  "contacts.read",
  "dashboard.read",
  "notes.read",
  "notifications.read",
  "tasks.read",
  "workflows.read",
  "workflow-definitions.read",
];

const ALL_PERMISSIONS: readonly AuthPermission[] = AUTH_PERMISSIONS;

const ROLE_PERMISSION_MAP: Record<BaseOrgRole, ReadonlySet<AuthPermission>> = {
  owner: new Set(ALL_PERMISSIONS),
  admin: new Set(ALL_PERMISSIONS),
  member: new Set(MEMBER_PERMISSIONS),
  user: new Set(MEMBER_PERMISSIONS),
  guest: new Set(GUEST_PERMISSIONS),
};

export type CustomRolePermissionMap = Map<string, ReadonlySet<AuthPermission>>;

interface PermissionResolutionOptions {
  customRolePermissions?: CustomRolePermissionMap;
}

function normalizeRoleList(
  roles: Iterable<NullableString>
): string[] {
  const normalized = new Set<string>();

  for (const role of roles) {
    const parsed = normalizeOrgRole(role);
    if (parsed) {
      normalized.add(parsed);
    }
  }

  return [...normalized];
}

export function isBaseOrgRole(role: NullableString): role is BaseOrgRole {
  const normalized = normalizeOrgRole(role);
  return (
    normalized === "owner" ||
    normalized === "admin" ||
    normalized === "member" ||
    normalized === "user" ||
    normalized === "guest"
  );
}

export function resolveBaseOrgRole(role: NullableString): BaseOrgRole | null {
  const normalized = normalizeOrgRole(role);

  if (normalized === "owner") return "owner";
  if (normalized === "admin") return "admin";
  if (normalized === "member") return "member";
  if (normalized === "guest") return "guest";
  if (normalized === "user") return "user";

  return null;
}

export function listPermissionsForRoles(
  roles: Iterable<NullableString>,
  options?: PermissionResolutionOptions
): AuthPermission[] {
  const customRolePermissions = options?.customRolePermissions ?? new Map();
  const resolvedPermissions = new Set<AuthPermission>();

  for (const role of normalizeRoleList(roles)) {
    const baseRole = resolveBaseOrgRole(role);
    if (baseRole) {
      for (const permission of ROLE_PERMISSION_MAP[baseRole]) {
        resolvedPermissions.add(permission);
      }
      continue;
    }

    for (const permission of customRolePermissions.get(role) ?? []) {
      resolvedPermissions.add(permission);
    }
  }

  return [...resolvedPermissions];
}

export function rolesHavePermission(
  roles: Iterable<NullableString>,
  permission: AuthPermission,
  options?: PermissionResolutionOptions
): boolean {
  return listPermissionsForRoles(roles, options).includes(permission);
}

export function roleHasPermission(
  role: NullableString,
  permission: AuthPermission,
  options?: PermissionResolutionOptions
): boolean {
  return rolesHavePermission([role], permission, options);
}

export function listPermissionsForRole(
  role: NullableString,
  options?: PermissionResolutionOptions
): AuthPermission[] {
  return listPermissionsForRoles([role], options);
}
