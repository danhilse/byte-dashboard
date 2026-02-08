/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  logActivity: vi.fn(),
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

import { DELETE, GET, PATCH } from "@/app/api/workflows/[id]/route";

function workflowGetQuery(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result),
  };
}

function selectQuery(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
}

function selectNoLimitQuery(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result),
  };
}

function deleteQuery() {
  const where = vi.fn().mockResolvedValue(undefined);
  return { where };
}

describe("app/api/workflows/[id]/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logActivity.mockResolvedValue(undefined);
  });

  it("GET returns 404 when workflow is missing", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select.mockReturnValue(workflowGetQuery([]));

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "wf_missing" }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Workflow not found" });
  });

  it("PATCH returns 409 for status changes on temporal-managed workflows", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select.mockReturnValue(
      selectNoLimitQuery([{ id: "wf_1", temporalWorkflowId: "temporal-1" }])
    );

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      }),
      { params: Promise.resolve({ id: "wf_1" }) }
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual(
      expect.objectContaining({
        error:
          "Status for Temporal-managed workflows cannot be changed directly. Signal the workflow instead.",
      })
    );
  });

  it("DELETE returns 409 when workflow has related tasks", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select
      .mockReturnValueOnce(selectNoLimitQuery([{ id: "wf_1" }]))
      .mockReturnValueOnce(selectQuery([{ id: "task_1" }]));

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "wf_1" }),
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual(
      expect.objectContaining({
        error:
          "Workflow cannot be deleted while tasks are linked to it. Remove or reassign related tasks first.",
      })
    );
  });

  it("DELETE removes workflow and logs activity", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select
      .mockReturnValueOnce(selectNoLimitQuery([{ id: "wf_1" }]))
      .mockReturnValueOnce(selectQuery([]));
    mocks.delete.mockReturnValue(deleteQuery());

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "wf_1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mocks.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_1",
        userId: "user_1",
        entityType: "workflow",
        entityId: "wf_1",
        action: "deleted",
      })
    );
  });
});
