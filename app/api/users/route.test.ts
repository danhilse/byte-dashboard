/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getOrganizationUsers: vi.fn(),
  getOrganizationRolePermissionMap: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/users/service", () => ({
  getOrganizationUsers: mocks.getOrganizationUsers,
}));

vi.mock("@/lib/auth/role-definitions", () => ({
  getOrganizationRolePermissionMap: mocks.getOrganizationRolePermissionMap,
}));

import { GET } from "@/app/api/users/route";

describe("app/api/users/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrganizationRolePermissionMap.mockResolvedValue(new Map());
  });

  it("returns 401 for unauthenticated requests", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.getOrganizationUsers).not.toHaveBeenCalled();
  });

  it("returns organization users for authenticated requests", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });
    mocks.getOrganizationUsers.mockResolvedValue([
      {
        id: "user_1",
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      users: [
        {
          id: "user_1",
          email: "ada@example.com",
          firstName: "Ada",
          lastName: "Lovelace",
        },
      ],
    });
  });

  it.each([
    { role: "org:owner" },
    { role: "org:admin" },
  ])("allows $role to read org user directory", async ({ role }) => {
    mocks.auth.mockResolvedValue({
      userId: "user_3",
      orgId: "org_1",
      orgRole: role,
    });
    mocks.getOrganizationUsers.mockResolvedValue([
      {
        id: "user_3",
        email: "owner-admin@example.com",
        firstName: "Owner",
        lastName: "Admin",
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      users: [
        {
          id: "user_3",
          email: "owner-admin@example.com",
          firstName: "Owner",
          lastName: "Admin",
        },
      ],
    });
  });

  it("allows org:user to read org user directory", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_2",
      orgId: "org_1",
      orgRole: "org:user",
    });
    mocks.getOrganizationUsers.mockResolvedValue([
      {
        id: "user_2",
        email: "grace@example.com",
        firstName: "Grace",
        lastName: "Hopper",
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      users: [
        {
          id: "user_2",
          email: "grace@example.com",
          firstName: "Grace",
          lastName: "Hopper",
        },
      ],
    });
  });

  it("returns 403 when guest attempts to read org user directory", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:guest",
    });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(mocks.getOrganizationUsers).not.toHaveBeenCalled();
  });

  it("returns 403 when custom role has no users.read permission mapping", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:reviewer",
    });
    mocks.getOrganizationRolePermissionMap.mockResolvedValue(new Map());

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(mocks.getOrganizationRolePermissionMap).toHaveBeenCalledWith("org_1");
    expect(mocks.getOrganizationUsers).not.toHaveBeenCalled();
  });

  it("allows custom role when org mapping grants users.read", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_4",
      orgId: "org_1",
      orgRole: "org:reviewer",
    });
    mocks.getOrganizationRolePermissionMap.mockResolvedValue(
      new Map([["reviewer", new Set(["users.read"])]])
    );
    mocks.getOrganizationUsers.mockResolvedValue([
      {
        id: "user_4",
        email: "reviewer@example.com",
        firstName: "Review",
        lastName: "User",
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.getOrganizationRolePermissionMap).toHaveBeenCalledWith("org_1");
    expect(await response.json()).toEqual({
      users: [
        {
          id: "user_4",
          email: "reviewer@example.com",
          firstName: "Review",
          lastName: "User",
        },
      ],
    });
  });

  it("returns 500 when user lookup fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });
    mocks.getOrganizationUsers.mockRejectedValue(new Error("database unavailable"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: "Failed to fetch users",
        details: "database unavailable",
      })
    );

    consoleErrorSpy.mockRestore();
  });
});
