/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    update: mocks.update,
    transaction: mocks.transaction,
  },
}));

import { DELETE, GET, PATCH } from "@/app/api/workflow-definitions/[id]/route";

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

describe("app/api/workflow-definitions/[id]/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 404 when definition not found", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select.mockReturnValue(selectQuery([]));

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "def_missing" }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Workflow definition not found" });
  });

  it("PATCH returns 404 when transactional clone finds no active definition", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        insert: vi.fn(),
      };
      return fn(tx);
    });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: Promise.resolve({ id: "def_missing" }) }
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Workflow definition not found" });
  });

  it("DELETE soft-deletes and returns success payload", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    const q = updateQuery([{ id: "def_1", isActive: false }]);
    mocks.update.mockReturnValue({ set: q.set });

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "def_1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      definition: { id: "def_1", isActive: false },
    });
  });
});
