/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  logActivity: vi.fn(),
  triggerWorkflowDefinitionsForContactCreated: vi.fn(),
  resolveContactFieldAccess: vi.fn(),
  redactContactsForRead: vi.fn(),
  redactContactForRead: vi.fn(),
  findForbiddenContactWriteFields: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
  },
}));

vi.mock("@/lib/db/log-activity", () => ({
  logActivity: mocks.logActivity,
}));
vi.mock("@/lib/workflow-triggers", () => ({
  triggerWorkflowDefinitionsForContactCreated:
    mocks.triggerWorkflowDefinitionsForContactCreated,
}));
vi.mock("@/lib/auth/field-visibility", () => ({
  resolveContactFieldAccess: mocks.resolveContactFieldAccess,
  redactContactsForRead: mocks.redactContactsForRead,
  redactContactForRead: mocks.redactContactForRead,
  findForbiddenContactWriteFields: mocks.findForbiddenContactWriteFields,
}));

import { GET, POST } from "@/app/api/contacts/route";

function createListQuery(result: unknown[]) {
  const query = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(result),
  };
  return query;
}

function createInsertQuery(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const values = vi.fn().mockReturnValue({ returning });
  return { values, returning };
}

describe("app/api/contacts/route", () => {
  const allFields = new Set([
    "firstName",
    "lastName",
    "email",
    "phone",
    "company",
    "role",
    "status",
    "avatarUrl",
    "lastContactedAt",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "zip",
    "tags",
    "metadata",
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logActivity.mockResolvedValue(undefined);
    mocks.triggerWorkflowDefinitionsForContactCreated.mockResolvedValue({
      started: [],
      failed: [],
    });
    mocks.resolveContactFieldAccess.mockResolvedValue({
      readableFields: allFields,
      writableFields: allFields,
    });
    mocks.redactContactsForRead.mockImplementation((contacts) => contacts);
    mocks.redactContactForRead.mockImplementation((contact) => contact);
    mocks.findForbiddenContactWriteFields.mockReturnValue([]);
  });

  it("returns 401 for unauthenticated GET requests", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("returns contacts for the authenticated org", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:guest",
    });
    const query = createListQuery([
      { id: "contact_1", firstName: "Ada", lastName: "Lovelace" },
    ]);
    mocks.select.mockReturnValue(query);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      contacts: [{ id: "contact_1", firstName: "Ada", lastName: "Lovelace" }],
    });
    expect(mocks.resolveContactFieldAccess).toHaveBeenCalledWith({
      orgId: "org_1",
      orgRoles: ["guest"],
    });
    expect(mocks.redactContactsForRead).toHaveBeenCalledTimes(1);
  });

  it("returns 403 when guest attempts to create contacts", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:guest",
    });
    const req = new Request("http://localhost/api/contacts", {
      method: "POST",
      body: JSON.stringify({ firstName: "Ada", lastName: "Lovelace" }),
    });

    const res = await POST(req);

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
      const req = new Request("http://localhost/api/contacts", {
        method: "POST",
        body: JSON.stringify({ firstName: "Ada" }),
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Validation failed");
      expect(json.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "lastName" })])
      );
      expect(mocks.insert).not.toHaveBeenCalled();
    }
  );

  it("returns 403 when payload includes forbidden fields", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });
    mocks.findForbiddenContactWriteFields.mockReturnValue(["email"]);

    const req = new Request("http://localhost/api/contacts", {
      method: "POST",
      body: JSON.stringify({ firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "Forbidden",
      details: "You do not have permission to update one or more contact fields",
      fields: ["email"],
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("returns 400 when required POST fields are missing", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });
    const req = new Request("http://localhost/api/contacts", {
      method: "POST",
      body: JSON.stringify({ firstName: "Ada" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Validation failed");
    expect(json.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "lastName" })])
    );
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid status enum on POST", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });
    const req = new Request("http://localhost/api/contacts", {
      method: "POST",
      body: JSON.stringify({ firstName: "Ada", lastName: "Lovelace", status: "garbage" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Validation failed");
    expect(json.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "status" })])
    );
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON body on POST", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });
    const req = new Request("http://localhost/api/contacts", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("creates a contact with defaults and logs activity", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });
    const insertQuery = createInsertQuery([
      { id: "contact_1", firstName: "Ada", lastName: "Lovelace" },
    ]);
    mocks.insert.mockReturnValue({
      values: insertQuery.values,
    });

    const req = new Request("http://localhost/api/contacts", {
      method: "POST",
      body: JSON.stringify({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      contact: { id: "contact_1", firstName: "Ada", lastName: "Lovelace" },
    });
    expect(insertQuery.values).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_1",
        firstName: "Ada",
        lastName: "Lovelace",
        status: "active",
        tags: [],
        metadata: {},
        lastContactedAt: null,
      })
    );
    expect(mocks.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_1",
        userId: "user_1",
        entityType: "contact",
        entityId: "contact_1",
        action: "created",
      })
    );
    expect(mocks.triggerWorkflowDefinitionsForContactCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_1",
        userId: "user_1",
        contact: expect.objectContaining({ id: "contact_1" }),
      })
    );
  });

  it("returns 500 when contact creation fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });
    mocks.insert.mockImplementation(() => {
      throw new Error("database unavailable");
    });
    const req = new Request("http://localhost/api/contacts", {
      method: "POST",
      body: JSON.stringify({ firstName: "Ada", lastName: "Lovelace" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual(
      expect.objectContaining({
        error: "Failed to create contact",
        details: "database unavailable",
      })
    );
    consoleErrorSpy.mockRestore();
  });
});
