import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { isOrgAdmin, normalizeOrgRole } from "@/lib/auth/roles";
import {
  type AuthPermission,
  type BaseOrgRole,
  resolveBaseOrgRole,
  roleHasPermission,
} from "@/lib/auth/permissions";

export interface PageAuthContext {
  userId: string;
  orgId: string;
  orgRole: string | null;
  baseOrgRole: BaseOrgRole;
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

  if (requireOrg && orgId && requireDbMembership) {
    const { getOrganizationMembership } = await import("@/lib/users/service");
    const membership = await getOrganizationMembership(orgId, userId, {
      syncFromClerkOnMissing: true,
    });

    if (!membership) {
      redirect(forbiddenRedirect);
    }

    effectiveOrgRole = normalizeOrgRole(membership.role);
  }

  if (requireAdmin && !isOrgAdmin(effectiveOrgRole)) {
    redirect(forbiddenRedirect);
  }

  if (
    requiredPermission &&
    !roleHasPermission(effectiveOrgRole, requiredPermission)
  ) {
    redirect(forbiddenRedirect);
  }

  return {
    userId,
    orgId: orgId ?? "",
    orgRole: effectiveOrgRole,
    baseOrgRole: resolveBaseOrgRole(effectiveOrgRole),
  };
}
