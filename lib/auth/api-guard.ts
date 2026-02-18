import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { normalizeOrgRole } from "@/lib/auth/roles";
import {
  type BaseOrgRole,
  type AuthPermission,
  isBaseOrgRole,
  rolesHavePermission,
  resolveBaseOrgRole,
} from "@/lib/auth/permissions";

export interface ApiAuthContext {
  userId: string;
  orgId: string;
  orgRole: string | null;
  orgRoles: string[];
  baseOrgRole: BaseOrgRole | null;
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
  let effectiveOrgRoles = effectiveOrgRole ? [effectiveOrgRole] : [];

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
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  if (
    requiredPermission &&
    !rolesHavePermission(effectiveOrgRoles, requiredPermission, {
      customRolePermissions,
    })
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
      orgRoles: effectiveOrgRoles,
      baseOrgRole: resolveBaseOrgRole(effectiveOrgRole),
    },
  };
}
