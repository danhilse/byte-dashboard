/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  markNotificationRead: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/notifications/service", () => ({
  markNotificationRead: mocks.markNotificationRead,
}));

import { PATCH } from "@/app/api/notifications/[id]/route";

describe("app/api/notifications/[id]/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.markNotificationRead.mockResolvedValue(true);
  });

  it("returns 401 for unauthenticated requests", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await PATCH(new Request("http://localhost"), {
      params: Promise.resolve({ id: "notif_1" }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when notification does not belong to user/org", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });
    mocks.markNotificationRead.mockResolvedValue(false);

    const res = await PATCH(new Request("http://localhost"), {
      params: Promise.resolve({ id: "notif_1" }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Notification not found" });
  });

  it("returns 403 for guest requests", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:guest",
    });

    const res = await PATCH(new Request("http://localhost"), {
      params: Promise.resolve({ id: "notif_1" }),
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
    expect(mocks.markNotificationRead).not.toHaveBeenCalled();
  });

  it("marks an individual notification as read", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });

    const res = await PATCH(new Request("http://localhost"), {
      params: Promise.resolve({ id: "notif_1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      notificationId: "notif_1",
    });
    expect(mocks.markNotificationRead).toHaveBeenCalledWith({
      orgId: "org_1",
      userId: "user_1",
      notificationId: "notif_1",
    });
  });
});
