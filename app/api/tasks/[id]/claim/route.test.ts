/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  buildTaskAccessContext: vi.fn(),
  canClaimTask: vi.fn(),
  logActivity: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    update: mocks.update,
  },
}));
vi.mock("@/lib/tasks/access", () => ({
  buildTaskAccessContext: mocks.buildTaskAccessContext,
  canClaimTask: mocks.canClaimTask,
}));
vi.mock("@/lib/db/log-activity", () => ({ logActivity: mocks.logActivity }));

import { PATCH } from "@/app/api/tasks/[id]/claim/route";

function selectQuery(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result),
  };
}

function updateQuery(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  return { set };
}

describe("app/api/tasks/[id]/claim/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logActivity.mockResolvedValue(undefined);
    mocks.buildTaskAccessContext.mockResolvedValue({ userId: "user_1" });
  });

  it("returns 400 when task is not role-assignable", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    mocks.select.mockReturnValue(
      selectQuery([{ id: "task_1", assignedTo: null, assignedRole: null }])
    );

    const res = await PATCH(new Request("http://localhost"), {
      params: Promise.resolve({ id: "task_1" }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Task is not role-assignable" });
  });

  it("returns 403 when user cannot claim task", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    mocks.select.mockReturnValue(
      selectQuery([{ id: "task_1", assignedTo: null, assignedRole: "reviewer" }])
    );
    mocks.canClaimTask.mockReturnValue(false);

    const res = await PATCH(new Request("http://localhost"), {
      params: Promise.resolve({ id: "task_1" }),
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "You do not have permission to claim this task",
    });
  });

  it("returns 409 when task is claimed concurrently", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    mocks.select
      .mockReturnValueOnce(
        selectQuery([{ id: "task_1", assignedTo: null, assignedRole: "reviewer" }])
      )
      .mockReturnValueOnce(selectQuery([{ id: "task_1" }]));
    mocks.canClaimTask.mockReturnValue(true);
    mocks.update.mockReturnValue({ set: updateQuery([]).set });

    const res = await PATCH(new Request("http://localhost"), {
      params: Promise.resolve({ id: "task_1" }),
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "Task already claimed by another user",
    });
  });

  it("claims task and logs activity", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    mocks.select.mockReturnValue(
      selectQuery([{ id: "task_1", assignedTo: null, assignedRole: "reviewer" }])
    );
    mocks.canClaimTask.mockReturnValue(true);
    mocks.update.mockReturnValue({ set: updateQuery([{ id: "task_1", assignedTo: "user_1" }]).set });

    const res = await PATCH(new Request("http://localhost"), {
      params: Promise.resolve({ id: "task_1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      task: { id: "task_1", assignedTo: "user_1" },
    });
    expect(mocks.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "updated",
        entityType: "task",
      })
    );
  });
});
