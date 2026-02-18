/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
  },
}));

import { GET } from "@/app/api/activity/route";

function createActivityQuery(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
}

describe("app/api/activity/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated requests", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await GET(new Request("http://localhost/api/activity"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("returns 400 when limit is not a positive integer", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });

    const res = await GET(new Request("http://localhost/api/activity?limit=abc"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "limit must be a positive integer" });
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("returns 400 when entityType is invalid", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });

    const res = await GET(
      new Request("http://localhost/api/activity?entityType=invalid&entityId=e1")
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "entityType must be workflow, contact, or task",
    });
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("returns mapped activities with default limit", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:guest",
    });
    const query = createActivityQuery([
      {
        id: "act_1",
        entityType: "workflow",
        entityId: "wf_1",
        action: "created",
        details: { title: "Workflow A" },
        createdAt: new Date("2026-02-01T10:00:00.000Z"),
        userId: "user_1",
        userFirstName: "Ada",
        userLastName: "Lovelace",
      },
      {
        id: "act_2",
        entityType: "task",
        entityId: "task_1",
        action: "updated",
        details: { status: "done" },
        createdAt: new Date("2026-02-01T11:00:00.000Z"),
        userId: null,
        userFirstName: null,
        userLastName: null,
      },
    ]);
    mocks.select.mockReturnValue(query);

    const res = await GET(new Request("http://localhost/api/activity"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      activities: [
        {
          id: "act_1",
          entityType: "workflow",
          entityId: "wf_1",
          action: "created",
          details: { title: "Workflow A" },
          createdAt: "2026-02-01T10:00:00.000Z",
          userId: "user_1",
          userName: "Ada Lovelace",
        },
        {
          id: "act_2",
          entityType: "task",
          entityId: "task_1",
          action: "updated",
          details: { status: "done" },
          createdAt: "2026-02-01T11:00:00.000Z",
          userId: null,
          userName: "System",
        },
      ],
    });
    expect(query.limit).toHaveBeenCalledWith(20);
  });

  it("clamps limit to 100 for entity-specific feeds", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    const query = createActivityQuery([]);
    mocks.select.mockReturnValue(query);

    const res = await GET(
      new Request(
        "http://localhost/api/activity?entityType=workflow&entityId=wf_1&limit=500"
      )
    );

    expect(res.status).toBe(200);
    expect(query.limit).toHaveBeenCalledWith(100);
  });

  it("returns 500 when query execution fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.select.mockImplementation(() => {
      throw new Error("database unavailable");
    });

    const res = await GET(new Request("http://localhost/api/activity"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual(
      expect.objectContaining({
        error: "Failed to fetch activity",
        details: "database unavailable",
      })
    );
    consoleErrorSpy.mockRestore();
  });
});
