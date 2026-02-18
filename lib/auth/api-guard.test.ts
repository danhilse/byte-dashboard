/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getOrganizationMembership: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/users/service", () => ({
  getOrganizationMembership: mocks.getOrganizationMembership,
}));

import { requireApiAuth } from "./api-guard";

describe("requireApiAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null, orgRole: null });

    const result = await requireApiAuth();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns 403 when org context is missing", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: null,
      orgRole: "org:admin",
    });

    const result = await requireApiAuth();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("returns 403 when db membership is missing for the active org", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:admin",
    });
    mocks.getOrganizationMembership.mockResolvedValue(null);

    const result = await requireApiAuth({ requireDbMembership: true });

    expect(mocks.getOrganizationMembership).toHaveBeenCalledWith("org_1", "user_1", {
      syncFromClerkOnMissing: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("uses db membership role for permission checks", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:admin",
    });
    mocks.getOrganizationMembership.mockResolvedValue({
      orgId: "org_1",
      userId: "user_1",
      role: "guest",
      roles: ["guest"],
      clerkRole: "org:guest",
    });

    const result = await requireApiAuth({
      requireDbMembership: true,
      requiredPermission: "admin.access",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("allows when db membership role grants required permission", async () => {
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

    const result = await requireApiAuth({
      requireDbMembership: true,
      requiredPermission: "workflow-definitions.write",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.orgRole).toBe("admin");
    }
  });
});
