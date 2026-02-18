/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  delete: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    delete: mocks.delete,
    select: mocks.select,
  },
}));

import { DELETE } from "@/app/api/notes/[id]/route";

function deleteQuery(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ returning });
  return { where };
}

function selectQuery(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result),
  };
}

describe("app/api/notes/[id]/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated requests", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "note_1" }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 when note exists but belongs to another user", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.delete.mockReturnValue(deleteQuery([]));
    mocks.select.mockReturnValue(selectQuery([{ id: "note_1" }]));

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "note_1" }),
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "You can only delete your own notes",
    });
  });

  it("returns success when note is deleted", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.delete.mockReturnValue(deleteQuery([{ id: "note_1" }]));

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "note_1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
