/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  logActivity: vi.fn(),
  triggerWorkflowDefinitionsForContactUpdated: vi.fn(),
  resolveContactFieldAccess: vi.fn(),
  redactContactForRead: vi.fn(),
  findForbiddenContactWriteFields: vi.fn(),
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
vi.mock("@/lib/workflow-triggers", () => ({
  triggerWorkflowDefinitionsForContactUpdated:
    mocks.triggerWorkflowDefinitionsForContactUpdated,
}));
vi.mock("@/lib/auth/field-visibility", () => ({
  resolveContactFieldAccess: mocks.resolveContactFieldAccess,
  redactContactForRead: mocks.redactContactForRead,
  findForbiddenContactWriteFields: mocks.findForbiddenContactWriteFields,
}));

import { DELETE, GET, PATCH } from "@/app/api/contacts/[id]/route";

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

describe("app/api/contacts/[id]/route", () => {
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
    mocks.triggerWorkflowDefinitionsForContactUpdated.mockResolvedValue({
      started: [],
      failed: [],
    });
    mocks.resolveContactFieldAccess.mockResolvedValue({
      readableFields: allFields,
      writableFields: allFields,
    });
    mocks.redactContactForRead.mockImplementation((contact) => contact);
    mocks.findForbiddenContactWriteFields.mockReturnValue([]);
  });

  it("GET returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "contact_1" }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("GET returns 404 when contact not found", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.select.mockReturnValue(selectQuery([]));

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "contact_missing" }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Contact not found" });
  });

  it("PATCH updates contact and logs activity", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.select.mockReturnValue(
      selectQuery([{ id: "contact_1", firstName: "Old", status: "lead" }])
    );
    const q = updateQuery([{ id: "contact_1", firstName: "Ada", status: "active" }]);
    mocks.update.mockReturnValue({ set: q.set });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ firstName: "Ada", status: "active" }),
      }),
      { params: Promise.resolve({ id: "contact_1" }) }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      contact: { id: "contact_1", firstName: "Ada", status: "active" },
    });
    expect(q.set).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Ada", status: "active" })
    );
    expect(mocks.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_1",
        userId: "user_1",
        entityType: "contact",
        entityId: "contact_1",
        action: "updated",
      })
    );
    expect(mocks.triggerWorkflowDefinitionsForContactUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_1",
        userId: "user_1",
        contact: expect.objectContaining({ id: "contact_1" }),
      })
    );
  });

  it("GET redacts fields according to visibility policy", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });
    mocks.select.mockReturnValue(
      selectQuery([{ id: "contact_1", firstName: "Ada", email: "ada@example.com" }])
    );
    mocks.redactContactForRead.mockReturnValue({
      id: "contact_1",
      firstName: "Ada",
      email: null,
    });

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "contact_1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      contact: { id: "contact_1", firstName: "Ada", email: null },
    });
    expect(mocks.redactContactForRead).toHaveBeenCalledTimes(1);
  });

  it("PATCH returns 403 when payload includes forbidden fields", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });
    mocks.select.mockReturnValue(
      selectQuery([{ id: "contact_1", firstName: "Ada", status: "active" }])
    );
    mocks.findForbiddenContactWriteFields.mockReturnValue(["email"]);

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ email: "ada@example.com" }),
      }),
      { params: Promise.resolve({ id: "contact_1" }) }
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "Forbidden",
      details: "You do not have permission to update one or more contact fields",
      fields: ["email"],
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("PATCH returns 400 when status is null (NOT NULL violation)", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.select.mockReturnValue(
      selectQuery([{ id: "contact_1", firstName: "Ada", status: "active" }])
    );

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ status: null }),
      }),
      { params: Promise.resolve({ id: "contact_1" }) }
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Validation failed");
    expect(json.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "status" })])
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("PATCH returns 400 when firstName is empty string", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.select.mockReturnValue(
      selectQuery([{ id: "contact_1", firstName: "Ada", status: "active" }])
    );

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ firstName: "" }),
      }),
      { params: Promise.resolve({ id: "contact_1" }) }
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Validation failed");
    expect(json.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "firstName" })])
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("DELETE returns 404 when contact does not exist", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.delete.mockReturnValue(deleteQuery([]));

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "contact_missing" }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Contact not found" });
  });
});
