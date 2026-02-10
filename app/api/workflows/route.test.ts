/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  logActivity: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
  },
}));
vi.mock("@/lib/db/log-activity", () => ({ logActivity: mocks.logActivity }));

import { GET, POST } from "@/app/api/workflows/route";

function workflowsListQuery(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(result),
  };
}

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

describe("app/api/workflows/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logActivity.mockResolvedValue(undefined);
  });

  it("GET returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("GET returns mapped executions", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select.mockReturnValue(
      workflowsListQuery([
        {
          workflow: { id: "wf_1", status: "running" },
          contact: {
            id: "contact_1",
            firstName: "Ada",
            lastName: "Lovelace",
            avatarUrl: "https://img",
            email: "ada@example.com",
          },
          definitionName: "Applicant Review",
        },
      ])
    );

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      workflows: [
        {
          id: "wf_1",
          status: "running",
          workflowExecutionState: "running",
          contact: {
            id: "contact_1",
            firstName: "Ada",
            lastName: "Lovelace",
            avatarUrl: "https://img",
            email: "ada@example.com",
          },
          contactName: "Ada Lovelace",
          contactAvatarUrl: "https://img",
          definitionName: "Applicant Review",
        },
      ],
    });
  });

  it("POST returns 400 when contactId is missing", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });

    const res = await POST(
      new Request("http://localhost/api/workflows", {
        method: "POST",
        body: JSON.stringify({ status: "draft" }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "contactId is required" });
  });

  it("POST creates workflow and logs activity", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select
      .mockReturnValueOnce(
        selectQuery([
          {
            id: "contact_1",
            firstName: "Ada",
            lastName: "Lovelace",
            avatarUrl: "https://img",
          },
        ])
      )
      .mockReturnValueOnce(
        selectQuery([
          {
            id: "def_1",
            name: "Applicant Review",
            version: 3,
          },
        ])
      );

    const q = insertQuery([
      {
        id: "wf_1",
        contactId: "contact_1",
        workflowDefinitionId: "def_1",
        definitionVersion: 3,
        status: "",
      },
    ]);
    mocks.insert.mockReturnValue({ values: q.values });

    const res = await POST(
      new Request("http://localhost/api/workflows", {
        method: "POST",
        body: JSON.stringify({
          contactId: "contact_1",
          workflowDefinitionId: "def_1",
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      workflow: {
        id: "wf_1",
        contactId: "contact_1",
        workflowDefinitionId: "def_1",
        definitionVersion: 3,
        status: "",
        workflowExecutionState: "running",
        contactName: "Ada Lovelace",
        contactAvatarUrl: "https://img",
        definitionName: "Applicant Review",
        definitionStatuses: [],
      },
    });
    expect(mocks.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_1",
        userId: "user_1",
        entityType: "workflow",
        action: "created",
      })
    );
  });
});
