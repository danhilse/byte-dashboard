import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { normalizeRoleName } from "@/lib/tasks/access";

export interface OrganizationUserRecord {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  roles: string[];
}

async function getOrganizationUsersFromDb(
  orgId: string
): Promise<OrganizationUserRecord[]> {
  return db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      roles: users.roles,
    })
    .from(users)
    .where(eq(users.orgId, orgId));
}

function normalizeMembershipRole(role: string | null | undefined): string {
  return normalizeRoleName(role) ?? "member";
}

export async function syncOrganizationUsersFromClerk(orgId: string): Promise<number> {
  const client = await clerkClient();
  const limit = 100;
  let offset = 0;
  let syncedCount = 0;

  while (true) {
    const page = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit,
      offset,
    });

    if (!page.data.length) {
      break;
    }

    for (const membership of page.data) {
      const publicUser = membership.publicUserData;
      if (!publicUser?.userId) {
        continue;
      }

      const normalizedRole = normalizeMembershipRole(membership.role);
      await db
        .insert(users)
        .values({
          id: publicUser.userId,
          orgId,
          email: publicUser.identifier || "",
          firstName: publicUser.firstName || null,
          lastName: publicUser.lastName || null,
          role: normalizedRole,
          roles: [normalizedRole],
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            orgId,
            email: publicUser.identifier || "",
            firstName: publicUser.firstName || null,
            lastName: publicUser.lastName || null,
            role: normalizedRole,
            roles: [normalizedRole],
            updatedAt: new Date(),
          },
        });

      syncedCount += 1;
    }

    offset += page.data.length;
    if (offset >= page.totalCount) {
      break;
    }
  }

  return syncedCount;
}

export async function getOrganizationUsers(
  orgId: string,
  options?: { syncFromClerkOnEmpty?: boolean }
): Promise<OrganizationUserRecord[]> {
  const syncFromClerkOnEmpty = options?.syncFromClerkOnEmpty ?? true;
  const localUsers = await getOrganizationUsersFromDb(orgId);

  if (localUsers.length > 0 || !syncFromClerkOnEmpty) {
    return localUsers;
  }

  try {
    const syncedCount = await syncOrganizationUsersFromClerk(orgId);
    if (syncedCount > 0) {
      return getOrganizationUsersFromDb(orgId);
    }
  } catch (error) {
    console.error(
      `Failed to sync users from Clerk for organization ${orgId}:`,
      error
    );
  }

  return localUsers;
}
