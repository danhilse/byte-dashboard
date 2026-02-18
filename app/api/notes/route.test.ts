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

import { GET, POST } from "@/app/api/notes/route";

function notesListQuery(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(result),
  };
}

function simpleSelectQuery(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result),
  };
}

function insertQuery(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const values = vi.fn().mockReturnValue({ returning });
  return { values };
}

describe("app/api/notes/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logActivity.mockResolvedValue(undefined);
  });

  it("GET returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await GET(new Request("http://localhost/api/notes"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("GET returns 400 for invalid entityType", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });

    const res = await GET(
      new Request("http://localhost/api/notes?entityType=bad&entityId=1")
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "entityType must be workflow, contact, or task",
    });
  });

  it("GET maps notes response shape", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.select.mockReturnValue(
      notesListQuery([
        {
          id: "note_1",
          entityType: "workflow",
          entityId: "wf_1",
          content: "Hello",
          createdAt: new Date("2026-02-02T10:00:00.000Z"),
          userId: "user_1",
          userFirstName: "Ada",
          userLastName: "Lovelace",
        },
      ])
    );

    const res = await GET(
      new Request(
        "http://localhost/api/notes?entityType=workflow&entityId=wf_1"
      )
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      notes: [
        {
          id: "note_1",
          entityType: "workflow",
          entityId: "wf_1",
          content: "Hello",
          createdAt: "2026-02-02T10:00:00.000Z",
          userId: "user_1",
          userName: "Ada Lovelace",
        },
      ],
    });
  });

  it("POST returns 400 when entityId is not UUID", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });

    const res = await POST(
      new Request("http://localhost/api/notes", {
        method: "POST",
        body: JSON.stringify({
          entityType: "workflow",
          entityId: "not-a-uuid",
          content: "hello",
        }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "entityId must be a valid UUID" });
  });

  it("POST creates a note and returns enriched user name", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:member" });
    mocks.select
      .mockReturnValueOnce(simpleSelectQuery([{ id: "wf_1" }]))
      .mockReturnValueOnce(simpleSelectQuery([{ firstName: "Ada", lastName: "Lovelace" }]));

    const q = insertQuery([
      {
        id: "note_1",
        entityType: "workflow",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        content: "Looks good",
        createdAt: new Date("2026-02-02T12:00:00.000Z"),
        userId: "user_1",
      },
    ]);
    mocks.insert.mockReturnValue({ values: q.values });

    const res = await POST(
      new Request("http://localhost/api/notes", {
        method: "POST",
        body: JSON.stringify({
          entityType: "workflow",
          entityId: "123e4567-e89b-12d3-a456-426614174000",
          content: "  Looks good  ",
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      note: {
        id: "note_1",
        entityType: "workflow",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        content: "Looks good",
        createdAt: "2026-02-02T12:00:00.000Z",
        userId: "user_1",
        userName: "Ada Lovelace",
      },
    });
    expect(mocks.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_1",
        userId: "user_1",
        entityType: "workflow",
        action: "note_added",
      })
    );
  });
});
