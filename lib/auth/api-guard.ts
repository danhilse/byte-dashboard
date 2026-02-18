import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isOrgAdmin, normalizeOrgRole } from "@/lib/auth/roles";
import {
  type AuthPermission,
  type BaseOrgRole,
  resolveBaseOrgRole,
  roleHasPermission,
} from "@/lib/auth/permissions";

export interface ApiAuthContext {
  userId: string;
  orgId: string;
  orgRole: string | null;
  baseOrgRole: BaseOrgRole;
}

type RequireApiAuthResult =
  | { ok: true; context: ApiAuthContext }
  | { ok: false; response: NextResponse };

interface RequireApiAuthOptions {
  requireAdmin?: boolean;
  requireOrg?: boolean;
  requiredPermission?: AuthPermission;
  requireDbMembership?: boolean;
}

export async function requireApiAuth(
  options?: RequireApiAuthOptions
): Promise<RequireApiAuthResult> {
  const requireAdmin = options?.requireAdmin ?? false;
  const requireOrg = options?.requireOrg ?? true;
  const requiredPermission = options?.requiredPermission;
  const requireDbMembership =
    options?.requireDbMembership ?? process.env.NODE_ENV !== "test";
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (requireOrg && !orgId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Organization context required" },
        { status: 403 }
      ),
    };
  }

  let effectiveOrgRole = normalizeOrgRole(orgRole);

  if (requireOrg && orgId && requireDbMembership) {
    const { getOrganizationMembership } = await import("@/lib/users/service");
    const membership = await getOrganizationMembership(orgId, userId, {
      syncFromClerkOnMissing: true,
    });

    if (!membership) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Organization membership required" },
          { status: 403 }
        ),
      };
    }

    effectiveOrgRole = normalizeOrgRole(membership.role);
  }

  if (requireAdmin && !isOrgAdmin(effectiveOrgRole)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  if (
    requiredPermission &&
    !roleHasPermission(effectiveOrgRole, requiredPermission)
  ) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    context: {
      userId,
      orgId: orgId ?? "",
      orgRole: effectiveOrgRole,
      baseOrgRole: resolveBaseOrgRole(effectiveOrgRole),
    },
  };
}
