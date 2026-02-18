/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  buildTaskAccessContext: vi.fn(),
  canMutateTask: vi.fn(),
  requiresApprovalComment: vi.fn(),
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
vi.mock("@/lib/tasks/approval-requirements", () => ({
  requiresApprovalComment: mocks.requiresApprovalComment,
}));
vi.mock("@/lib/temporal/client", () => ({
  getTemporalClient: mocks.getTemporalClient,
}));
vi.mock("@/lib/db/log-activity", () => ({ logActivity: mocks.logActivity }));

import { PATCH } from "@/app/api/tasks/[id]/approve/route";
import {
  APPROVAL_SUBMITTED_SIGNAL_NAME,
  TASK_COMPLETED_SIGNAL_NAME,
} from "@/lib/workflows/signal-types";

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

describe("app/api/tasks/[id]/approve/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildTaskAccessContext.mockResolvedValue({ userId: "user_1" });
    mocks.canMutateTask.mockReturnValue(true);
    mocks.requiresApprovalComment.mockResolvedValue(false);
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
        body: JSON.stringify({ comment: "Looks good" }),
      }),
      { params: Promise.resolve({ id: "task_1" }) }
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each(["owner", "admin", "user"])(
    "allows %s to reach approval validation",
    async (orgRole) => {
      mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole });

      const res = await PATCH(
        new Request("http://localhost", {
          method: "PATCH",
          body: JSON.stringify({ comment: 123 }),
        }),
        { params: Promise.resolve({ id: "task_1" }) }
      );

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "comment must be a string when provided",
      });
    }
  );

  it("returns 400 when comment is not a string", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ comment: 123 }),
      }),
      { params: Promise.resolve({ id: "task_1" }) }
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "comment must be a string when provided",
    });
  });

  it("returns 400 when task is not approval type", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    mocks.select.mockReturnValue(selectQuery([{ id: "task_1", taskType: "standard" }]));

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "task_1" }) }
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Task is not an approval task" });
  });

  it("approves task and returns workflowSignaled false when no workflow link", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    mocks.select.mockReturnValue(
      selectQuery([{ id: "task_1", taskType: "approval", workflowExecutionId: null }])
    );
    mocks.update.mockReturnValue({
      set: updateQuery([{ id: "task_1", workflowExecutionId: null, outcome: "approved" }]).set,
    });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ comment: "  Approved " }),
      }),
      { params: Promise.resolve({ id: "task_1" }) }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      taskId: "task_1",
      outcome: "approved",
      comment: "Approved",
      workflowSignaled: false,
      task: { id: "task_1", workflowExecutionId: null, outcome: "approved" },
    });
    expect(mocks.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "status_changed",
      })
    );
  });

  it("signals temporal workflow when approval task is approved", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    mocks.select
      .mockReturnValueOnce(
        selectQuery([
          {
            id: "task_1",
            taskType: "approval",
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
      set: updateQuery([
        { id: "task_1", workflowExecutionId: "wf_exec_1", outcome: "approved" },
      ]).set,
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
        body: JSON.stringify({ comment: "Looks good" }),
      }),
      { params: Promise.resolve({ id: "task_1" }) }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      taskId: "task_1",
      outcome: "approved",
      comment: "Looks good",
      workflowSignaled: true,
      task: { id: "task_1", workflowExecutionId: "wf_exec_1", outcome: "approved" },
    });
    expect(getHandle).toHaveBeenCalledWith("generic-workflow-wf_exec_1");
    expect(signal).toHaveBeenCalledTimes(2);
    expect(signal).toHaveBeenCalledWith(TASK_COMPLETED_SIGNAL_NAME, {
      taskId: "task_1",
      completedBy: "user_1",
    });
    expect(signal).toHaveBeenCalledWith(APPROVAL_SUBMITTED_SIGNAL_NAME, {
      outcome: "approved",
      comment: "Looks good",
      approvedBy: "user_1",
    });
  });
});
