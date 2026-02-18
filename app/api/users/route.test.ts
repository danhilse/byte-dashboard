/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getOrganizationUsers: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/users/service", () => ({
  getOrganizationUsers: mocks.getOrganizationUsers,
}));

import { GET } from "@/app/api/users/route";

describe("app/api/users/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
