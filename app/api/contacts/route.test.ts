/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  logActivity: vi.fn(),
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
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logActivity.mockResolvedValue(undefined);
  });

  it("returns 401 for unauthenticated GET requests", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("returns contacts for the authenticated org", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    const query = createListQuery([
      { id: "contact_1", firstName: "Ada", lastName: "Lovelace" },
    ]);
    mocks.select.mockReturnValue(query);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      contacts: [{ id: "contact_1", firstName: "Ada", lastName: "Lovelace" }],
    });
  });

  it("returns 400 when required POST fields are missing", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    const req = new Request("http://localhost/api/contacts", {
      method: "POST",
      body: JSON.stringify({ firstName: "Ada" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "firstName and lastName are required",
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("creates a contact with defaults and logs activity", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
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
  });

  it("returns 500 when contact creation fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
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
