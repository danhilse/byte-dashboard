import { clerkClient } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { organizationMemberships, users } from "@/lib/db/schema";
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
      role: organizationMemberships.role,
      roles: organizationMemberships.roles,
    })
    .from(organizationMemberships)
    .innerJoin(users, eq(users.id, organizationMemberships.userId))
    .where(eq(organizationMemberships.orgId, orgId));
}

export function normalizeMembershipRole(role: string | null | undefined): string {
  return normalizeRoleName(role) ?? "member";
}

interface UpsertClerkUserProfileInput {
  userId: string;
  legacyOrgId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
}

export async function upsertClerkUserProfile(input: UpsertClerkUserProfileInput) {
  const normalizedRole = normalizeMembershipRole(input.role);

  await db
    .insert(users)
    .values({
      id: input.userId,
      orgId: input.legacyOrgId,
      email: input.email,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      role: normalizedRole,
      roles: [normalizedRole],
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: input.email,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        role: normalizedRole,
        roles: [normalizedRole],
        updatedAt: new Date(),
      },
    });
}

interface UpsertOrganizationMembershipInput {
  orgId: string;
  userId: string;
  clerkRole?: string | null;
}

export async function upsertOrganizationMembership(
  input: UpsertOrganizationMembershipInput
) {
  const normalizedRole = normalizeMembershipRole(input.clerkRole);

  await db
    .insert(organizationMemberships)
    .values({
      orgId: input.orgId,
      userId: input.userId,
      clerkRole: input.clerkRole ?? null,
      role: normalizedRole,
      roles: [normalizedRole],
    })
    .onConflictDoUpdate({
      target: [
        organizationMemberships.orgId,
        organizationMemberships.userId,
      ],
      set: {
        clerkRole: input.clerkRole ?? null,
        role: normalizedRole,
        roles: [normalizedRole],
        updatedAt: new Date(),
      },
    });
}

export async function removeOrganizationMembership(orgId: string, userId: string) {
  await db
    .delete(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.orgId, orgId),
        eq(organizationMemberships.userId, userId)
      )
    );
}

export async function isUserInOrganization(orgId: string, userId: string): Promise<boolean> {
  const [membership] = await db
    .select({ userId: organizationMemberships.userId })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.orgId, orgId),
        eq(organizationMemberships.userId, userId)
      )
    )
    .limit(1);

  return Boolean(membership);
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

      await upsertClerkUserProfile({
        userId: publicUser.userId,
        legacyOrgId: orgId,
        email: publicUser.identifier || "",
        firstName: publicUser.firstName || null,
        lastName: publicUser.lastName || null,
        role: membership.role,
      });

      await upsertOrganizationMembership({
        orgId,
        userId: publicUser.userId,
        clerkRole: membership.role,
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
