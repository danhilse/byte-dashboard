/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  logActivity: vi.fn(),
  getTemporalClient: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
    update: mocks.update,
  },
}));
vi.mock("@/lib/db/log-activity", () => ({ logActivity: mocks.logActivity }));
vi.mock("@/lib/temporal/client", () => ({
  getTemporalClient: mocks.getTemporalClient,
}));

import { POST } from "@/app/api/workflows/trigger/route";

function selectQuery(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result),
  };
}

function insertQuery(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const values = vi.fn().mockReturnValue({ returning });
  return { values };
}

function updateQuery() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  return { set };
}

describe("app/api/workflows/trigger/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logActivity.mockResolvedValue(undefined);
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await POST(new Request("http://localhost", { method: "POST", body: "{}" }));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when contactId is missing", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "contactId is required" });
  });

  it("returns 404 when workflow definition is not found", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select
      .mockReturnValueOnce(
        selectQuery([
          { id: "contact_1", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
        ])
      )
      .mockReturnValueOnce(selectQuery([]));

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          contactId: "contact_1",
          workflowDefinitionId: "def_missing",
        }),
      })
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Workflow definition not found" });
  });

  it("starts generic workflow and updates execution with temporal ids", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select
      .mockReturnValueOnce(
        selectQuery([
          {
            id: "contact_1",
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
            phone: "555-1234",
            avatarUrl: "https://img",
          },
        ])
      )
      .mockReturnValueOnce(
        selectQuery([
          {
            id: "def_1",
            name: "Generic Review",
            version: 2,
          },
        ])
      );
    mocks.insert.mockReturnValue(
      {
        values: insertQuery([
          {
            id: "wf_1",
            contactId: "contact_1",
            workflowDefinitionId: "def_1",
            definitionVersion: 2,
            status: "running",
            source: "manual",
          },
        ]).values,
      }
    );
    mocks.getTemporalClient.mockResolvedValue({
      workflow: {
        start: vi.fn().mockResolvedValue({
          workflowId: "generic-workflow-wf_1",
          firstExecutionRunId: "run_1",
        }),
      },
    });
    mocks.update.mockReturnValue({ set: updateQuery().set });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          contactId: "contact_1",
          workflowDefinitionId: "def_1",
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      workflowId: "wf_1",
      temporalWorkflowId: "generic-workflow-wf_1",
      status: "running",
      workflow: {
        id: "wf_1",
        contactId: "contact_1",
        workflowDefinitionId: "def_1",
        definitionVersion: 2,
        status: "running",
        source: "manual",
        temporalWorkflowId: "generic-workflow-wf_1",
        temporalRunId: "run_1",
        contactName: "Ada Lovelace",
        contactAvatarUrl: "https://img",
        definitionName: "Generic Review",
        definitionStatuses: [],
      },
    });
    expect(mocks.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_1",
        userId: "user_1",
        action: "created",
      })
    );
  });
});
