type NullableString = string | null | undefined;

export function normalizeOrgRole(role: NullableString): string | null {
  if (!role) return null;
  const normalized = role.trim().toLowerCase().replace(/^org:/, "");
  return normalized.length > 0 ? normalized : null;
}

export function isOrgAdmin(role: NullableString): boolean {
  const normalized = normalizeOrgRole(role);
  return normalized === "admin" || normalized === "owner";
}
