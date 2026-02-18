/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  getOrganizationMembership: vi.fn(),
  getOrganizationRolePermissionMap: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/users/service", () => ({
  getOrganizationMembership: mocks.getOrganizationMembership,
}));

vi.mock("@/lib/auth/role-definitions", () => ({
  getOrganizationRolePermissionMap: mocks.getOrganizationRolePermissionMap,
}));

import { requirePageAuth } from "./page-guard";

describe("requirePageAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    });
    mocks.getOrganizationRolePermissionMap.mockResolvedValue(new Map());
  });

  it("redirects to sign-in when user is not authenticated", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null, orgRole: null });

    await expect(requirePageAuth()).rejects.toThrow("REDIRECT:/sign-in");
  });

  it("redirects to no-org path when org context is missing", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: null,
      orgRole: "org:admin",
    });

    await expect(requirePageAuth()).rejects.toThrow("REDIRECT:/");
  });

  it("redirects to forbidden path when db membership is missing", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:admin",
    });
    mocks.getOrganizationMembership.mockResolvedValue(null);

    await expect(
      requirePageAuth({ requireDbMembership: true })
    ).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("uses db membership role when evaluating permissions", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:guest",
    });
    mocks.getOrganizationMembership.mockResolvedValue({
      orgId: "org_1",
      userId: "user_1",
      role: "admin",
      roles: ["admin"],
      clerkRole: "org:admin",
    });

    const result = await requirePageAuth({
      requireDbMembership: true,
      requiredPermission: "workflow-definitions.write",
    });

    expect(result.orgRole).toBe("admin");
    expect(result.orgRoles).toEqual(["admin"]);
  });

  it("redirects unknown custom roles when no custom mapping grants access", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:reviewer",
    });
    mocks.getOrganizationMembership.mockResolvedValue({
      orgId: "org_1",
      userId: "user_1",
      role: "reviewer",
      roles: ["reviewer"],
      clerkRole: null,
    });
    mocks.getOrganizationRolePermissionMap.mockResolvedValue(new Map());

    await expect(
      requirePageAuth({
        requireDbMembership: true,
        requiredPermission: "tasks.read",
      })
    ).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("allows custom role when org-specific mapping grants permission", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:reviewer",
    });
    mocks.getOrganizationMembership.mockResolvedValue({
      orgId: "org_1",
      userId: "user_1",
      role: "reviewer",
      roles: ["reviewer"],
      clerkRole: null,
    });
    mocks.getOrganizationRolePermissionMap.mockResolvedValue(
      new Map([["reviewer", new Set(["tasks.read"])]])
    );

    const result = await requirePageAuth({
      requireDbMembership: true,
      requiredPermission: "tasks.read",
    });

    expect(mocks.getOrganizationRolePermissionMap).toHaveBeenCalledWith("org_1");
    expect(result.orgRoles).toEqual(["reviewer"]);
  });
});
