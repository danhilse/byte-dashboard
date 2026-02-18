/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
  delete: vi.fn(),
  clerkClient: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: mocks.insert,
    select: mocks.select,
    delete: mocks.delete,
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: mocks.clerkClient,
}));

vi.mock("@/lib/db/schema", () => ({
  users: {
    id: "users.id",
  },
  organizationMemberships: {
    orgId: "organization_memberships.org_id",
    userId: "organization_memberships.user_id",
    clerkRole: "organization_memberships.clerk_role",
    role: "organization_memberships.role",
    roles: "organization_memberships.roles",
    updatedAt: "organization_memberships.updated_at",
  },
}));

import { upsertClerkUserProfile } from "@/lib/users/service";

describe("lib/users/service upsertClerkUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts user profile data without legacy org/role columns", async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    mocks.insert.mockReturnValue({ values });

    await upsertClerkUserProfile({
      userId: "user_1",
      email: "owner@example.com",
      firstName: "Owner",
      lastName: "User",
    });

    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ id: "users.id" }));
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user_1",
        email: "owner@example.com",
        firstName: "Owner",
        lastName: "User",
      })
    );
  });

  it("updates only profile fields on conflict", async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    mocks.insert.mockReturnValue({ values });

    await upsertClerkUserProfile({
      userId: "user_1",
      email: "updated@example.com",
      firstName: "Updated",
      lastName: "Name",
    });

    expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
    const [args] = onConflictDoUpdate.mock.calls[0];
    expect(args).toEqual(
      expect.objectContaining({
        target: "users.id",
        set: expect.objectContaining({
          email: "updated@example.com",
          firstName: "Updated",
          lastName: "Name",
        }),
      })
    );
  });
});
