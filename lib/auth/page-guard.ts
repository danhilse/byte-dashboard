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
  const signInRedirect = options?.signInRedirect ?? "/sign-in";
  const noOrgRedirect = options?.noOrgRedirect ?? "/";
  const forbiddenRedirect = options?.forbiddenRedirect ?? "/dashboard";
  const { userId, orgId, orgRole } = await auth();
  const normalizedOrgRole = normalizeOrgRole(orgRole);

  if (!userId) {
    redirect(signInRedirect);
  }

  if (requireOrg && !orgId) {
    redirect(noOrgRedirect);
  }

  if (requireAdmin && !isOrgAdmin(orgRole)) {
    redirect(forbiddenRedirect);
  }

  if (
    requiredPermission &&
    !roleHasPermission(normalizedOrgRole, requiredPermission)
  ) {
    redirect(forbiddenRedirect);
  }

  return {
    userId,
    orgId: orgId ?? "",
    orgRole: normalizedOrgRole,
    baseOrgRole: resolveBaseOrgRole(normalizedOrgRole),
  };
}
