import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { normalizeOrgRole } from "@/lib/auth/roles";
import { checkGlobalRateLimit } from "@/lib/security/global-rate-limit";
import {
  addRateLimitHeaders,
  checkRateLimit,
  getAuthenticatedRateLimitIdentifier,
  isRateLimitingEnabled,
  type RateLimitPolicyName,
} from "@/lib/security/rate-limit";
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
  hasAdminAccess: boolean;
}

type RequireApiAuthResult =
  | { ok: true; context: ApiAuthContext }
  | { ok: false; response: NextResponse };

interface RequireApiAuthOptions {
  requireAdmin?: boolean;
  requireOrg?: boolean;
  requiredPermission?: AuthPermission;
  requireDbMembership?: boolean;
  rateLimitPolicy?: ApiAuthRateLimitPolicy | false;
}

type ApiAuthRateLimitPolicy = Extract<
  RateLimitPolicyName,
  "api.read" | "api.write" | "api.admin"
>;

function shouldUseGlobalRateLimiter(policy: ApiAuthRateLimitPolicy): boolean {
  return policy === "api.write" || policy === "api.admin";
}

function resolveDefaultRateLimitPolicy(options: {
  requireAdmin: boolean;
  requiredPermission?: AuthPermission;
}): ApiAuthRateLimitPolicy {
  if (options.requireAdmin) {
    return "api.admin";
  }

  if (options.requiredPermission?.endsWith(".read")) {
    return "api.read";
  }

  return "api.write";
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

  const rateLimitPolicy =
    options?.rateLimitPolicy === undefined
      ? resolveDefaultRateLimitPolicy({ requireAdmin, requiredPermission })
      : options.rateLimitPolicy;

  const shouldApplyRateLimit =
    rateLimitPolicy !== false &&
    process.env.NODE_ENV !== "test" &&
    isRateLimitingEnabled();

  if (shouldApplyRateLimit && rateLimitPolicy) {
    const identifier = getAuthenticatedRateLimitIdentifier(
      userId,
      orgId ?? undefined
    );
    const rateLimitResult = shouldUseGlobalRateLimiter(rateLimitPolicy)
      ? await checkGlobalRateLimit({
          policy: rateLimitPolicy,
          identifier,
        })
      : checkRateLimit({
          policy: rateLimitPolicy,
          identifier,
        });

    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
      addRateLimitHeaders(response.headers, rateLimitResult.headers);

      return {
        ok: false,
        response,
      };
    }
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

  if (requireOrg && orgId) {
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

  const hasAdminAccess = rolesHavePermission(
    effectiveOrgRoles,
    "admin.access",
    { customRolePermissions }
  );

  if (
    requireAdmin &&
    !hasAdminAccess
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
      hasAdminAccess,
    },
  };
}
