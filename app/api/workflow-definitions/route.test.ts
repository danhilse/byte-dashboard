/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
  },
}));

import { GET, POST } from "@/app/api/workflow-definitions/route";

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

describe("app/api/workflow-definitions/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await GET(
      new Request("http://localhost/api/workflow-definitions")
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("GET returns definitions for full=true", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select.mockReturnValue(selectQuery([{ id: "def_1", name: "Review Flow" }]));

    const res = await GET(
      new Request("http://localhost/api/workflow-definitions?full=true")
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      definitions: [{ id: "def_1", name: "Review Flow" }],
    });
  });

  it("POST returns 400 when name is missing", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });

    const res = await POST(
      new Request("http://localhost/api/workflow-definitions", {
        method: "POST",
        body: JSON.stringify({ description: "desc" }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "name is required" });
  });

  it("POST creates workflow definition with defaults", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    const q = insertQuery([{ id: "def_1", name: "Review Flow", version: 1 }]);
    mocks.insert.mockReturnValue({ values: q.values });

    const res = await POST(
      new Request("http://localhost/api/workflow-definitions", {
        method: "POST",
        body: JSON.stringify({ name: "  Review Flow  " }),
      })
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      definition: { id: "def_1", name: "Review Flow", version: 1 },
    });
    expect(q.values).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_1",
        name: "Review Flow",
        version: 1,
        isActive: true,
        steps: [],
        statuses: [],
      })
    );
  });

  it("POST creates workflow definition with provided statuses", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    const q = insertQuery([{ id: "def_1", name: "Review Flow", version: 1 }]);
    mocks.insert.mockReturnValue({ values: q.values });

    const statuses = [
      { id: "draft", label: "Draft", order: 0, color: "#64748b" },
      { id: "approved", label: "Approved", order: 1, color: "#22c55e" },
    ];

    const res = await POST(
      new Request("http://localhost/api/workflow-definitions", {
        method: "POST",
        body: JSON.stringify({ name: "Review Flow", statuses }),
      })
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      definition: { id: "def_1", name: "Review Flow", version: 1 },
    });
    expect(q.values).toHaveBeenCalledWith(
      expect.objectContaining({
        statuses,
      })
    );
  });

  it("POST returns 400 when statuses payload is invalid", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });

    const res = await POST(
      new Request("http://localhost/api/workflow-definitions", {
        method: "POST",
        body: JSON.stringify({
          name: "Review Flow",
          statuses: [{ id: "draft", label: "Draft", order: "zero" }],
        }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "statuses must be a valid DefinitionStatus[] when provided",
    });
  });
});
