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

export function resolveBaseOrgRole(role: NullableString): BaseOrgRole {
  const normalized = normalizeOrgRole(role);

  if (normalized === "owner") return "owner";
  if (normalized === "admin") return "admin";
  if (normalized === "guest") return "guest";
  if (normalized === "user") return "user";

  // Unknown/custom roles get member-equivalent defaults until custom RBAC lands.
  return "member";
}

export function roleHasPermission(
  role: NullableString,
  permission: AuthPermission
): boolean {
  const baseRole = resolveBaseOrgRole(role);
  return ROLE_PERMISSION_MAP[baseRole].has(permission);
}

export function listPermissionsForRole(role: NullableString): AuthPermission[] {
  const baseRole = resolveBaseOrgRole(role);
  return [...ROLE_PERMISSION_MAP[baseRole]];
}
