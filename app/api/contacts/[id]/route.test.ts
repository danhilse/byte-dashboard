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
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logActivity.mockResolvedValue(undefined);
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
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select.mockReturnValue(selectQuery([]));

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "contact_missing" }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Contact not found" });
  });

  it("PATCH updates contact and logs activity", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
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
  });

  it("DELETE returns 404 when contact does not exist", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.delete.mockReturnValue(deleteQuery([]));

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "contact_missing" }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Contact not found" });
  });
});
