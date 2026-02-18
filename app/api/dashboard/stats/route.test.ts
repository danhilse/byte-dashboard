/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getDashboardStats: vi.fn(),
  getWorkflowCountsByStatus: vi.fn(),
  getRecentWorkflows: vi.fn(),
  getMyTasks: vi.fn(),
  getRecentActivity: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/db/queries", () => ({
  getDashboardStats: mocks.getDashboardStats,
  getWorkflowCountsByStatus: mocks.getWorkflowCountsByStatus,
  getRecentWorkflows: mocks.getRecentWorkflows,
  getMyTasks: mocks.getMyTasks,
  getRecentActivity: mocks.getRecentActivity,
}));

import { GET } from "@/app/api/dashboard/stats/route";

describe("app/api/dashboard/stats/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated requests", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns dashboard payload for authenticated users", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.getDashboardStats.mockResolvedValue({ totalContacts: 42 });
    mocks.getWorkflowCountsByStatus.mockResolvedValue({ running: 3, completed: 9 });
    mocks.getRecentWorkflows.mockResolvedValue([{ id: "wf_1" }]);
    mocks.getMyTasks.mockResolvedValue([{ id: "task_1" }]);
    mocks.getRecentActivity.mockResolvedValue([{ id: "act_1" }]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      stats: { totalContacts: 42 },
      workflowsByStatus: { running: 3, completed: 9 },
      recentWorkflows: [{ id: "wf_1" }],
      myTasks: [{ id: "task_1" }],
      recentActivity: [{ id: "act_1" }],
    });
    expect(mocks.getRecentWorkflows).toHaveBeenCalledWith("org_1", 5);
    expect(mocks.getMyTasks).toHaveBeenCalledWith("org_1", "user_1", 5);
    expect(mocks.getRecentActivity).toHaveBeenCalledWith("org_1", 10);
  });

  it("allows guest role to read dashboard stats", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_guest",
      orgId: "org_1",
      orgRole: "org:guest",
    });
    mocks.getDashboardStats.mockResolvedValue({ totalContacts: 10 });
    mocks.getWorkflowCountsByStatus.mockResolvedValue({ running: 1 });
    mocks.getRecentWorkflows.mockResolvedValue([]);
    mocks.getMyTasks.mockResolvedValue([]);
    mocks.getRecentActivity.mockResolvedValue([]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      stats: { totalContacts: 10 },
      workflowsByStatus: { running: 1 },
      recentWorkflows: [],
      myTasks: [],
      recentActivity: [],
    });
    expect(mocks.getMyTasks).toHaveBeenCalledWith("org_1", "user_guest", 5);
  });

  it("returns 500 when data loading fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.getDashboardStats.mockRejectedValue(new Error("query failed"));
    mocks.getWorkflowCountsByStatus.mockResolvedValue({});
    mocks.getRecentWorkflows.mockResolvedValue([]);
    mocks.getMyTasks.mockResolvedValue([]);
    mocks.getRecentActivity.mockResolvedValue([]);

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual(
      expect.objectContaining({
        error: "Failed to fetch dashboard stats",
        details: "query failed",
      })
    );
    consoleErrorSpy.mockRestore();
  });
});
