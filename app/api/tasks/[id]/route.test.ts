/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  logActivity: vi.fn(),
  createTaskAssignedNotification: vi.fn(),
  buildTaskAccessContext: vi.fn(),
  canClaimTask: vi.fn(),
  canMutateTask: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    update: mocks.update,
    delete: mocks.delete,
  },
}));
vi.mock("@/lib/db/log-activity", () => ({ logActivity: mocks.logActivity }));
vi.mock("@/lib/notifications/service", () => ({
  createTaskAssignedNotification: mocks.createTaskAssignedNotification,
}));
vi.mock("@/lib/tasks/access", () => ({
  buildTaskAccessContext: mocks.buildTaskAccessContext,
  canClaimTask: mocks.canClaimTask,
  canMutateTask: mocks.canMutateTask,
}));

import { DELETE, GET, PATCH } from "@/app/api/tasks/[id]/route";

function taskDetailsQuery(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result),
  };
}

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

function deleteQuery(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ returning });
  return { where };
}

describe("app/api/tasks/[id]/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logActivity.mockResolvedValue(undefined);
    mocks.createTaskAssignedNotification.mockResolvedValue(undefined);
    mocks.buildTaskAccessContext.mockResolvedValue({ userId: "user_1" });
  });

  it("GET returns 403 when user cannot mutate or claim task", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    mocks.select.mockReturnValue(
      taskDetailsQuery([
        {
          id: "task_1",
          assignedTo: "user_2",
          assignedRole: "reviewer",
          contactFirstName: "Ada",
          contactLastName: "Lovelace",
        },
      ])
    );
    mocks.canMutateTask.mockReturnValue(false);
    mocks.canClaimTask.mockReturnValue(false);

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "task_1" }),
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "You do not have permission to access this task",
    });
  });

  it("PATCH returns 400 when status is included in payload", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ status: "done" }),
      }),
      { params: Promise.resolve({ id: "task_1" }) }
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(
      expect.objectContaining({
        error:
          "Use PATCH /api/tasks/{id}/status to update status (ensures workflow signaling)",
      })
    );
  });

  it("PATCH updates task and logs activity", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    mocks.canMutateTask.mockReturnValue(true);
    mocks.select
      .mockReturnValueOnce(selectQuery([{ id: "task_1", assignedTo: "user_1" }]))
      .mockReturnValueOnce(selectQuery([{ id: "contact_1" }]));
    const q = updateQuery([{ id: "task_1", title: "Updated title" }]);
    mocks.update.mockReturnValue({ set: q.set });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated title", contactId: "contact_1" }),
      }),
      { params: Promise.resolve({ id: "task_1" }) }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      task: { id: "task_1", title: "Updated title" },
    });
    expect(mocks.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "task",
        entityId: "task_1",
        action: "updated",
      })
    );
  });

  it("PATCH creates a notification when assignment changes", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    mocks.canMutateTask.mockReturnValue(true);
    mocks.select.mockReturnValueOnce(selectQuery([{ id: "task_1", assignedTo: "user_1" }]));
    const q = updateQuery([{ id: "task_1", title: "Updated title", assignedTo: "user_2" }]);
    mocks.update.mockReturnValue({ set: q.set });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ assignedTo: "user_2" }),
      }),
      { params: Promise.resolve({ id: "task_1" }) }
    );

    expect(res.status).toBe(200);
    expect(mocks.createTaskAssignedNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_1",
        userId: "user_2",
        taskId: "task_1",
      })
    );
  });

  it("PATCH normalizes task links in metadata", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    mocks.canMutateTask.mockReturnValue(true);
    mocks.select.mockReturnValueOnce(selectQuery([{ id: "task_1", assignedTo: "user_1" }]));
    const q = updateQuery([{ id: "task_1", metadata: { links: ["https://a.example"] } }]);
    mocks.update.mockReturnValue({ set: q.set });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({
          metadata: {
            links: [" https://a.example ", "", "https://a.example", "https://b.example"],
          },
        }),
      }),
      { params: Promise.resolve({ id: "task_1" }) }
    );

    expect(res.status).toBe(200);
    expect(q.set).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { links: ["https://a.example", "https://b.example"] },
      })
    );
  });

  it("DELETE returns 403 when user cannot mutate task", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    mocks.select.mockReturnValue(selectQuery([{ id: "task_1", assignedTo: "user_2" }]));
    mocks.canMutateTask.mockReturnValue(false);

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "task_1" }),
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "You do not have permission to delete this task",
    });
  });

  it("DELETE removes task and logs activity", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    mocks.select.mockReturnValue(selectQuery([{ id: "task_1", assignedTo: "user_1" }]));
    mocks.canMutateTask.mockReturnValue(true);
    mocks.delete.mockReturnValue(deleteQuery([{ id: "task_1", title: "Review docs" }]));

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "task_1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      task: { id: "task_1", title: "Review docs" },
    });
    expect(mocks.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "deleted",
      })
    );
  });
});
