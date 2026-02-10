/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getNotificationsForUser: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/notifications/service", () => ({
  getNotificationsForUser: mocks.getNotificationsForUser,
  markAllNotificationsRead: mocks.markAllNotificationsRead,
}));

import { GET, PATCH } from "@/app/api/notifications/route";

describe("app/api/notifications/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getNotificationsForUser.mockResolvedValue({
      notifications: [],
      unreadCount: 0,
    });
    mocks.markAllNotificationsRead.mockResolvedValue(0);
  });

  it("returns 401 for unauthenticated GET requests", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await GET(new Request("http://localhost/api/notifications"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns user notifications for authenticated GET requests", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.getNotificationsForUser.mockResolvedValue({
      notifications: [{ id: "notif_1", title: "Hello", isRead: false }],
      unreadCount: 1,
    });

    const res = await GET(new Request("http://localhost/api/notifications?limit=15"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      notifications: [{ id: "notif_1", title: "Hello", isRead: false }],
      unreadCount: 1,
    });
    expect(mocks.getNotificationsForUser).toHaveBeenCalledWith({
      orgId: "org_1",
      userId: "user_1",
      limit: 15,
    });
  });

  it("marks all notifications as read for authenticated PATCH requests", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.markAllNotificationsRead.mockResolvedValue(3);

    const res = await PATCH();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      markedReadCount: 3,
      unreadCount: 0,
    });
    expect(mocks.markAllNotificationsRead).toHaveBeenCalledWith({
      orgId: "org_1",
      userId: "user_1",
    });
  });
});
