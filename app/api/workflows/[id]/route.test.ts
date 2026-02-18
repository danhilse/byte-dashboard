/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkflowNotFoundError } from "@temporalio/common";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getTemporalClient: vi.fn(),
  logActivity: vi.fn(),
  resolveContactFieldAccess: vi.fn(),
  redactContactForRead: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    update: mocks.update,
    delete: mocks.delete,
  },
}));
vi.mock("@/lib/temporal/client", () => ({
  getTemporalClient: mocks.getTemporalClient,
}));
vi.mock("@/lib/db/log-activity", () => ({ logActivity: mocks.logActivity }));
vi.mock("@/lib/auth/field-visibility", () => ({
  resolveContactFieldAccess: mocks.resolveContactFieldAccess,
  redactContactForRead: mocks.redactContactForRead,
}));

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
    mocks.resolveContactFieldAccess.mockResolvedValue({
      readableFields: new Set(["firstName", "lastName", "avatarUrl", "email"]),
      writableFields: new Set(),
    });
    mocks.redactContactForRead.mockImplementation((contact) => contact);
  });

  it("GET returns workflow details with redacted contact data", async () => {
    const redactedContact = {
      id: "contact_1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: null,
      avatarUrl: "https://img",
    };

    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.select.mockReturnValue(
      workflowGetQuery([
        {
          workflow: {
            id: "wf_1",
            status: "running",
            completedAt: null,
          },
          contact: {
            id: "contact_1",
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
            avatarUrl: "https://img",
          },
          definitionName: "Applicant Review",
          definitionStatuses: [],
        },
      ])
    );
    mocks.redactContactForRead.mockReturnValue(redactedContact);

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "wf_1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: "wf_1",
      status: "running",
      completedAt: null,
      workflowExecutionState: "running",
      contact: redactedContact,
      contactName: "Ada Lovelace",
      contactAvatarUrl: "https://img",
      definitionName: "Applicant Review",
      definitionStatuses: [],
    });
    expect(mocks.resolveContactFieldAccess).toHaveBeenCalledWith({
      orgId: "org_1",
      orgRoles: ["member"],
    });
    expect(mocks.redactContactForRead).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "contact_1",
        email: "ada@example.com",
      }),
      expect.any(Set)
    );
  });

  it("GET allows guest role for workflow reads", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_guest",
      orgId: "org_1",
      orgRole: "org:guest",
    });
    mocks.select.mockReturnValue(
      workflowGetQuery([
        {
          workflow: { id: "wf_1", status: "running", completedAt: null },
          contact: {
            id: "contact_1",
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
            avatarUrl: "https://img",
          },
          definitionName: "Applicant Review",
          definitionStatuses: [],
        },
      ])
    );

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "wf_1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(
      expect.objectContaining({
        id: "wf_1",
        status: "running",
        definitionName: "Applicant Review",
      })
    );
    expect(mocks.resolveContactFieldAccess).toHaveBeenCalledWith({
      orgId: "org_1",
      orgRoles: ["guest"],
    });
  });

  it("GET returns 404 when workflow is missing", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.select.mockReturnValue(workflowGetQuery([]));

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "wf_missing" }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Workflow not found" });
  });

  it("PATCH returns 403 for guest write requests", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_guest",
      orgId: "org_1",
      orgRole: "org:guest",
    });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ status: "running" }),
      }),
      { params: Promise.resolve({ id: "wf_1" }) }
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each(["org:owner", "org:admin", "org:user"])(
    "PATCH allows %s and reaches temporal-state guard",
    async (orgRole) => {
      mocks.auth.mockResolvedValue({
        userId: "user_1",
        orgId: "org_1",
        orgRole,
      });
      mocks.select.mockReturnValue(
        selectNoLimitQuery([{ id: "wf_1", temporalWorkflowId: "temporal-1" }])
      );

      const res = await PATCH(
        new Request("http://localhost", {
          method: "PATCH",
          body: JSON.stringify({ status: "running" }),
        }),
        { params: Promise.resolve({ id: "wf_1" }) }
      );

      expect(res.status).toBe(409);
      expect(await res.json()).toEqual(
        expect.objectContaining({
          error:
            "Status/state for Temporal-managed workflows cannot be changed directly. Signal the workflow instead.",
        })
      );
    }
  );

  it("PATCH returns 409 for status changes on temporal-managed workflows", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
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
          "Status/state for Temporal-managed workflows cannot be changed directly. Signal the workflow instead.",
      })
    );
  });

  it("DELETE returns 409 when workflow has related tasks", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.select
      .mockReturnValueOnce(selectNoLimitQuery([{ id: "wf_1", temporalWorkflowId: null }]))
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

  it("DELETE returns 403 for guest write requests", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_guest",
      orgId: "org_1",
      orgRole: "org:guest",
    });

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "wf_1" }),
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it.each(["org:owner", "org:admin", "org:user"])(
    "DELETE allows %s and reaches business guard checks",
    async (orgRole) => {
      mocks.auth.mockResolvedValue({
        userId: "user_1",
        orgId: "org_1",
        orgRole,
      });
      mocks.select
        .mockReturnValueOnce(selectNoLimitQuery([{ id: "wf_1", temporalWorkflowId: null }]))
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
    }
  );

  it("DELETE removes workflow and logs activity", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.select
      .mockReturnValueOnce(selectNoLimitQuery([{ id: "wf_1", temporalWorkflowId: null }]))
      .mockReturnValueOnce(selectQuery([]));
    mocks.delete.mockReturnValue(deleteQuery());

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "wf_1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      temporalTermination: "skipped",
    });
    expect(mocks.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_1",
        userId: "user_1",
        entityType: "workflow",
        entityId: "wf_1",
        action: "deleted",
        details: {
          temporalTermination: "skipped",
          temporalWorkflowId: null,
        },
      })
    );
  });

  it("DELETE terminates Temporal workflow before deleting DB record", async () => {
    const terminate = vi.fn().mockResolvedValue(undefined);
    const getHandle = vi.fn().mockReturnValue({ terminate });

    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.select
      .mockReturnValueOnce(
        selectNoLimitQuery([
          {
            id: "wf_1",
            temporalWorkflowId: "temporal-1",
            temporalRunId: "run-1",
          },
        ])
      )
      .mockReturnValueOnce(selectQuery([]));
    mocks.getTemporalClient.mockResolvedValue({
      workflow: { getHandle },
    });
    mocks.delete.mockReturnValue(deleteQuery());

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "wf_1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      temporalTermination: "terminated",
    });
    expect(getHandle).toHaveBeenCalledWith("temporal-1");
    expect(terminate).toHaveBeenCalledWith("Deleted from dashboard");
  });

  it("DELETE still removes DB record when Temporal workflow is not found", async () => {
    const terminate = vi
      .fn()
      .mockRejectedValue(
        new WorkflowNotFoundError("missing", "temporal-1", "run-1")
      );

    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.select
      .mockReturnValueOnce(
        selectNoLimitQuery([
          {
            id: "wf_1",
            temporalWorkflowId: "temporal-1",
            temporalRunId: "run-1",
          },
        ])
      )
      .mockReturnValueOnce(selectQuery([]));
    mocks.getTemporalClient.mockResolvedValue({
      workflow: {
        getHandle: vi.fn().mockReturnValue({ terminate }),
      },
    });
    mocks.delete.mockReturnValue(deleteQuery());

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "wf_1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      temporalTermination: "not_found",
    });
    expect(mocks.delete).toHaveBeenCalled();
  });

  it("DELETE returns 502 and does not delete DB record on Temporal termination failure", async () => {
    const terminate = vi
      .fn()
      .mockRejectedValue(new Error("temporal unavailable"));

    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.select
      .mockReturnValueOnce(
        selectNoLimitQuery([
          {
            id: "wf_1",
            temporalWorkflowId: "temporal-1",
            temporalRunId: "run-1",
          },
        ])
      )
      .mockReturnValueOnce(selectQuery([]));
    mocks.getTemporalClient.mockResolvedValue({
      workflow: {
        getHandle: vi.fn().mockReturnValue({ terminate }),
      },
    });

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "wf_1" }),
    });

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: "Failed to terminate Temporal workflow",
      details: "temporal unavailable",
    });
    expect(mocks.delete).not.toHaveBeenCalled();
  });
});
