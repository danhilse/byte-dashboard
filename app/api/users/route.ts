import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/api-guard";
import { getOrganizationUsers } from "@/lib/users/service";
import { withApiRequestLogging } from "@/lib/logging/api-route";

/**
 * GET /api/users
 *
 * Lists users for the authenticated organization.
 */
async function GETHandler() {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "users.read",
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { orgId } = authResult.context;

    const organizationUsers = await getOrganizationUsers(orgId);
    const sortedUsers = [...organizationUsers].sort((a, b) => {
      const leftFirst = (a.firstName ?? "").toLowerCase();
      const rightFirst = (b.firstName ?? "").toLowerCase();
      if (leftFirst !== rightFirst) return leftFirst.localeCompare(rightFirst);

      const leftLast = (a.lastName ?? "").toLowerCase();
      const rightLast = (b.lastName ?? "").toLowerCase();
      if (leftLast !== rightLast) return leftLast.localeCompare(rightLast);

      return a.email.toLowerCase().localeCompare(b.email.toLowerCase());
    });

    return NextResponse.json({
      users: sortedUsers.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      })),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch users",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export const GET = withApiRequestLogging(GETHandler);
