import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { normalizeOrgRole } from "@/lib/auth/roles";
import {
  type BaseOrgRole,
  type AuthPermission,
  isBaseOrgRole,
  rolesHavePermission,
  resolveBaseOrgRole,
} from "@/lib/auth/permissions";

export interface PageAuthContext {
  userId: string;
  orgId: string;
  orgRole: string | null;
  orgRoles: string[];
  baseOrgRole: BaseOrgRole | null;
}

interface RequirePageAuthOptions {
  requireAdmin?: boolean;
  requireOrg?: boolean;
  requiredPermission?: AuthPermission;
  requireDbMembership?: boolean;
  signInRedirect?: string;
  noOrgRedirect?: string;
  forbiddenRedirect?: string;
}

export async function requirePageAuth(
  options?: RequirePageAuthOptions
): Promise<PageAuthContext> {
  const requireAdmin = options?.requireAdmin ?? false;
  const requireOrg = options?.requireOrg ?? true;
  const requiredPermission = options?.requiredPermission;
  const requireDbMembership =
    options?.requireDbMembership ?? process.env.NODE_ENV !== "test";
  const signInRedirect = options?.signInRedirect ?? "/sign-in";
  const noOrgRedirect = options?.noOrgRedirect ?? "/";
  const forbiddenRedirect = options?.forbiddenRedirect ?? "/dashboard";
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    redirect(signInRedirect);
  }

  if (requireOrg && !orgId) {
    redirect(noOrgRedirect);
  }

  let effectiveOrgRole = normalizeOrgRole(orgRole);
  let effectiveOrgRoles = effectiveOrgRole ? [effectiveOrgRole] : [];

  if (requireOrg && orgId && requireDbMembership) {
    const { getOrganizationMembership } = await import("@/lib/users/service");
    const membership = await getOrganizationMembership(orgId, userId, {
      syncFromClerkOnMissing: true,
    });

    if (!membership) {
      redirect(forbiddenRedirect);
    }

    effectiveOrgRole = normalizeOrgRole(membership.role);
    const membershipRoles = membership.roles
      .map((role) => normalizeOrgRole(role))
      .filter((role): role is string => Boolean(role));

    if (effectiveOrgRole) {
      membershipRoles.push(effectiveOrgRole);
    }

    effectiveOrgRoles = [...new Set(membershipRoles)];
  }

  let customRolePermissions:
    | Map<string, ReadonlySet<AuthPermission>>
    | undefined;

  if ((requireAdmin || requiredPermission) && requireOrg && orgId) {
    const hasCustomRoles = effectiveOrgRoles.some(
      (role) => !isBaseOrgRole(role)
    );

    if (hasCustomRoles) {
      const { getOrganizationRolePermissionMap } = await import(
        "@/lib/auth/role-definitions"
      );
      customRolePermissions = await getOrganizationRolePermissionMap(orgId);
    }
  }

  if (
    requireAdmin &&
    !rolesHavePermission(effectiveOrgRoles, "admin.access", {
      customRolePermissions,
    })
  ) {
    redirect(forbiddenRedirect);
  }

  if (
    requiredPermission &&
    !rolesHavePermission(effectiveOrgRoles, requiredPermission, {
      customRolePermissions,
    })
  ) {
    redirect(forbiddenRedirect);
  }

  return {
    userId,
    orgId: orgId ?? "",
    orgRole: effectiveOrgRole,
    orgRoles: effectiveOrgRoles,
    baseOrgRole: resolveBaseOrgRole(effectiveOrgRole),
  };
}
