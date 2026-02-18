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
}

export async function requireApiAuth(
  options?: RequireApiAuthOptions
): Promise<RequireApiAuthResult> {
  const requireAdmin = options?.requireAdmin ?? false;
  const requireOrg = options?.requireOrg ?? true;
  const requiredPermission = options?.requiredPermission;
  const { userId, orgId, orgRole } = await auth();
  const normalizedOrgRole = normalizeOrgRole(orgRole);

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

  if (requireAdmin && !isOrgAdmin(orgRole)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  if (
    requiredPermission &&
    !roleHasPermission(normalizedOrgRole, requiredPermission)
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
      orgRole: normalizedOrgRole,
      baseOrgRole: resolveBaseOrgRole(normalizedOrgRole),
    },
  };
}
