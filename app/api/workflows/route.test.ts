/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  logActivity: vi.fn(),
  resolveContactFieldAccess: vi.fn(),
  redactContactForRead: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
  },
}));
vi.mock("@/lib/db/log-activity", () => ({ logActivity: mocks.logActivity }));
vi.mock("@/lib/auth/field-visibility", () => ({
  resolveContactFieldAccess: mocks.resolveContactFieldAccess,
  redactContactForRead: mocks.redactContactForRead,
}));

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
    mocks.resolveContactFieldAccess.mockResolvedValue({
      readableFields: new Set(["firstName", "lastName", "avatarUrl", "email"]),
      writableFields: new Set(),
    });
    mocks.redactContactForRead.mockImplementation((contact) => contact);
  });

  it("GET returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("GET returns mapped executions", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:guest",
    });
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
    expect(mocks.resolveContactFieldAccess).toHaveBeenCalledWith({
      orgId: "org_1",
      orgRoles: ["guest"],
    });
    expect(mocks.redactContactForRead).toHaveBeenCalledTimes(1);
  });

  it("POST returns 403 for guest users", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:guest",
    });

    const res = await POST(
      new Request("http://localhost/api/workflows", {
        method: "POST",
        body: JSON.stringify({
          contactId: "contact_1",
          workflowDefinitionId: "def_1",
        }),
      })
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it.each(["org:owner", "org:admin", "org:user"])(
    "POST allows %s and reaches validation",
    async (orgRole) => {
      mocks.auth.mockResolvedValue({
        userId: "user_1",
        orgId: "org_1",
        orgRole,
      });

      const res = await POST(
        new Request("http://localhost/api/workflows", {
          method: "POST",
          body: JSON.stringify({ status: "draft" }),
        })
      );

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "contactId is required" });
    }
  );

  it("POST returns 400 when contactId is missing", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });

    const res = await POST(
      new Request("http://localhost/api/workflows", {
        method: "POST",
        body: JSON.stringify({ status: "draft" }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "contactId is required" });
  });

  it("POST returns 404 when contact is outside the authenticated org", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });
    mocks.select.mockReturnValueOnce(selectQuery([]));

    const res = await POST(
      new Request("http://localhost/api/workflows", {
        method: "POST",
        body: JSON.stringify({
          contactId: "contact_other_org",
          workflowDefinitionId: "def_1",
        }),
      })
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Contact not found" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("POST returns 404 when workflow definition is outside the authenticated org", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });
    mocks.select
      .mockReturnValueOnce(
        selectQuery([
          {
            id: "contact_1",
            firstName: "Ada",
            lastName: "Lovelace",
          },
        ])
      )
      .mockReturnValueOnce(selectQuery([]));

    const res = await POST(
      new Request("http://localhost/api/workflows", {
        method: "POST",
        body: JSON.stringify({
          contactId: "contact_1",
          workflowDefinitionId: "def_other_org",
        }),
      })
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Workflow definition not found" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("POST creates workflow and logs activity", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
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
