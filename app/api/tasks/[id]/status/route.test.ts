/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  buildTaskAccessContext: vi.fn(),
  canMutateTask: vi.fn(),
  getTemporalClient: vi.fn(),
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
  canMutateTask: mocks.canMutateTask,
}));
vi.mock("@/lib/temporal/client", () => ({
  getTemporalClient: mocks.getTemporalClient,
}));
vi.mock("@/lib/db/log-activity", () => ({ logActivity: mocks.logActivity }));

import { PATCH } from "@/app/api/tasks/[id]/status/route";
import { TASK_COMPLETED_SIGNAL_NAME } from "@/lib/workflows/signal-types";

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

describe("app/api/tasks/[id]/status/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildTaskAccessContext.mockResolvedValue({ userId: "user_1" });
    mocks.canMutateTask.mockReturnValue(true);
    mocks.logActivity.mockResolvedValue(undefined);
  });

  it("returns 403 for guest requests", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "guest",
    });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ status: "done" }),
      }),
      { params: Promise.resolve({ id: "task_1" }) }
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each(["owner", "admin", "user"])(
    "allows %s to reach status validation",
    async (orgRole) => {
      mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole });

      const res = await PATCH(
        new Request("http://localhost", {
          method: "PATCH",
          body: JSON.stringify({ status: "bad" }),
        }),
        { params: Promise.resolve({ id: "task_1" }) }
      );

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Invalid status" });
    }
  );

  it("returns 400 for invalid status", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ status: "bad" }),
      }),
      { params: Promise.resolve({ id: "task_1" }) }
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid status" });
  });

  it("returns 400 when approval task is marked done via status endpoint", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    mocks.select.mockReturnValue(
      selectQuery([{ id: "task_1", status: "todo", taskType: "approval" }])
    );

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
          "Approval tasks cannot be marked done via /status. Use /approve or /reject.",
      })
    );
  });

  it("updates non-terminal status and logs activity", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    mocks.select.mockReturnValue(
      selectQuery([{ id: "task_1", status: "todo", taskType: "standard" }])
    );
    mocks.update.mockReturnValue({
      set: updateQuery([{ id: "task_1", status: "in_progress" }]).set,
    });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ status: "in_progress" }),
      }),
      { params: Promise.resolve({ id: "task_1" }) }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      taskId: "task_1",
      status: "in_progress",
      workflowSignaled: false,
      task: { id: "task_1", status: "in_progress" },
    });
    expect(mocks.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "status_changed",
      })
    );
  });

  it("returns idempotent success when task is already done", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    mocks.select
      .mockReturnValueOnce(
        selectQuery([
          {
            id: "task_1",
            status: "todo",
            taskType: "standard",
            workflowExecutionId: null,
          },
        ])
      )
      .mockReturnValueOnce(selectQuery([{ id: "task_1", status: "done" }]));
    mocks.update.mockReturnValue({ set: updateQuery([]).set });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ status: "done" }),
      }),
      { params: Promise.resolve({ id: "task_1" }) }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      taskId: "task_1",
      status: "done",
      workflowSignaled: false,
      task: { id: "task_1", status: "done" },
    });
  });

  it("signals temporal workflow when linked task is completed", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    mocks.select
      .mockReturnValueOnce(
        selectQuery([
          {
            id: "task_1",
            status: "todo",
            taskType: "standard",
            workflowExecutionId: "wf_exec_1",
          },
        ])
      )
      .mockReturnValueOnce(
        selectQuery([
          {
            id: "wf_exec_1",
            orgId: "org_1",
            temporalWorkflowId: "generic-workflow-wf_exec_1",
          },
        ])
      );
    mocks.update.mockReturnValue({
      set: updateQuery([{ id: "task_1", status: "done", workflowExecutionId: "wf_exec_1" }]).set,
    });

    const signal = vi.fn().mockResolvedValue(undefined);
    const getHandle = vi.fn().mockReturnValue({ signal });
    mocks.getTemporalClient.mockResolvedValue({
      workflow: {
        getHandle,
      },
    });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ status: "done" }),
      }),
      { params: Promise.resolve({ id: "task_1" }) }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      taskId: "task_1",
      status: "done",
      workflowSignaled: true,
      task: { id: "task_1", status: "done", workflowExecutionId: "wf_exec_1" },
    });
    expect(getHandle).toHaveBeenCalledWith("generic-workflow-wf_exec_1");
    expect(signal).toHaveBeenCalledWith(TASK_COMPLETED_SIGNAL_NAME, {
      taskId: "task_1",
      completedBy: "user_1",
    });
  });
});
