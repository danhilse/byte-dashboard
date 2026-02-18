/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_DEFINITION_STATUSES } from "@/lib/workflow-builder-v2/status-guardrails";

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

function groupedSelectQuery(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockResolvedValue(result),
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
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:admin" });
    mocks.select.mockReturnValue(selectQuery([{ id: "def_1", name: "Review Flow" }]));

    const res = await GET(
      new Request("http://localhost/api/workflow-definitions?full=true")
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      definitions: [{ id: "def_1", name: "Review Flow" }],
    });
  });

  it("GET full=true returns 403 for non-admin users", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });

    const res = await GET(
      new Request("http://localhost/api/workflow-definitions?full=true")
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("GET full=true returns 403 for org:user", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_2",
      orgId: "org_1",
      orgRole: "org:user",
    });

    const res = await GET(
      new Request("http://localhost/api/workflow-definitions?full=true")
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("GET full=true returns 403 for guests", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:guest",
    });

    const res = await GET(
      new Request("http://localhost/api/workflow-definitions?full=true")
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("GET returns definitions for full=true when role is org:owner", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:owner",
    });
    mocks.select.mockReturnValue(selectQuery([{ id: "def_owner_1", name: "Owner Flow" }]));

    const res = await GET(
      new Request("http://localhost/api/workflow-definitions?full=true")
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      definitions: [{ id: "def_owner_1", name: "Owner Flow" }],
    });
  });

  it("GET returns lightweight definitions by default", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:admin" });
    mocks.select
      .mockReturnValueOnce(
        selectQuery([
          {
            id: "def_1",
            name: "Review Flow",
            description: null,
            version: 1,
            statuses: [],
          },
        ])
      )
      .mockReturnValueOnce(
        groupedSelectQuery([
          {
            workflowDefinitionId: "def_1",
            runCount: 3,
            lastRunAt: "2025-01-15T10:00:00.000Z",
          },
        ])
      );

    const res = await GET(
      new Request("http://localhost/api/workflow-definitions")
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      definitions: [
        {
          id: "def_1",
          name: "Review Flow",
          description: null,
          version: 1,
          statuses: [],
          runCount: 3,
          lastRunAt: "2025-01-15T10:00:00.000Z",
        },
      ],
    });
  });

  it("GET returns 500 when query throws", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:admin" });
    mocks.select.mockImplementation(() => {
      throw new Error("db exploded");
    });

    const res = await GET(
      new Request("http://localhost/api/workflow-definitions")
    );

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Failed to fetch workflow definitions",
      details: "db exploded",
    });
  });

  it("POST returns 400 when name is missing", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:admin" });

    const res = await POST(
      new Request("http://localhost/api/workflow-definitions", {
        method: "POST",
        body: JSON.stringify({ description: "desc" }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "name is required" });
  });

  it("POST returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await POST(
      new Request("http://localhost/api/workflow-definitions", {
        method: "POST",
        body: JSON.stringify({ name: "Review Flow" }),
      })
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("POST returns 403 for non-admin users", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });

    const res = await POST(
      new Request("http://localhost/api/workflow-definitions", {
        method: "POST",
        body: JSON.stringify({ name: "Review Flow" }),
      })
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("POST returns 403 for org:user", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_2",
      orgId: "org_1",
      orgRole: "org:user",
    });

    const res = await POST(
      new Request("http://localhost/api/workflow-definitions", {
        method: "POST",
        body: JSON.stringify({ name: "User cannot create" }),
      })
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("POST returns 403 for guests", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:guest",
    });

    const res = await POST(
      new Request("http://localhost/api/workflow-definitions", {
        method: "POST",
        body: JSON.stringify({ name: "Review Flow" }),
      })
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("POST permits org:owner (falls through to validation)", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_owner",
      orgId: "org_1",
      orgRole: "org:owner",
    });

    const res = await POST(
      new Request("http://localhost/api/workflow-definitions", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "name is required" });
  });

  it("POST returns 400 when description is not a string", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:admin" });

    const res = await POST(
      new Request("http://localhost/api/workflow-definitions", {
        method: "POST",
        body: JSON.stringify({ name: "Review Flow", description: 123 }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "description must be a string when provided",
    });
  });

  it("POST creates workflow definition with defaults", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:admin" });
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
        statuses: DEFAULT_DEFINITION_STATUSES,
        steps: expect.arrayContaining([
          expect.objectContaining({ type: "trigger" }),
        ]),
        variables: expect.objectContaining({
          __builderV2Authoring: expect.any(Object),
        }),
      })
    );
  });

  it("POST rejects direct steps writes", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:admin" });

    const res = await POST(
      new Request("http://localhost/api/workflow-definitions", {
        method: "POST",
        body: JSON.stringify({ name: "Review Flow", steps: [] }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error:
        "direct steps writes are not supported; use authoring payload through the workflow builder editor",
    });
  });

  it("POST duplicates a workflow definition from sourceDefinitionId", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:admin" });

    const sourceDefinition = {
      id: "def_source",
      orgId: "org_1",
      name: "Review Flow",
      description: "Original definition",
      version: 3,
      phases: [{ id: "phase_review", label: "Review", order: 0 }],
      steps: [{ id: "step_1", type: "trigger" }],
      variables: { __builderV2Authoring: { workflow: { steps: [] } } },
      statuses: [{ id: "draft", label: "Draft", order: 0 }],
      isActive: true,
    };

    mocks.select.mockReturnValue(selectQuery([sourceDefinition]));
    const q = insertQuery([
      { id: "def_copy", name: "Review Flow (Copy)", version: 1 },
    ]);
    mocks.insert.mockReturnValue({ values: q.values });

    const res = await POST(
      new Request("http://localhost/api/workflow-definitions", {
        method: "POST",
        body: JSON.stringify({
          name: "Review Flow (Copy)",
          sourceDefinitionId: "def_source",
        }),
      })
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      definition: { id: "def_copy", name: "Review Flow (Copy)", version: 1 },
    });
    expect(q.values).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_1",
        name: "Review Flow (Copy)",
        description: "Original definition",
        version: 1,
        phases: sourceDefinition.phases,
        steps: sourceDefinition.steps,
        variables: sourceDefinition.variables,
        statuses: sourceDefinition.statuses,
        isActive: true,
      })
    );
  });

  it("POST returns 404 when sourceDefinitionId is missing", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:admin" });
    mocks.select.mockReturnValue(selectQuery([]));

    const res = await POST(
      new Request("http://localhost/api/workflow-definitions", {
        method: "POST",
        body: JSON.stringify({
          name: "Review Flow (Copy)",
          sourceDefinitionId: "missing_definition",
        }),
      })
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: "Source workflow definition not found",
    });
  });

  it("POST returns 400 when sourceDefinitionId is invalid", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:admin" });

    const res = await POST(
      new Request("http://localhost/api/workflow-definitions", {
        method: "POST",
        body: JSON.stringify({
          name: "Review Flow (Copy)",
          sourceDefinitionId: 123,
        }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "sourceDefinitionId must be a non-empty string when provided",
    });
  });

  it("POST creates workflow definition with provided statuses", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:admin" });
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
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:admin" });

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

  it("POST returns 400 when statuses contain duplicate ids", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:admin" });

    const res = await POST(
      new Request("http://localhost/api/workflow-definitions", {
        method: "POST",
        body: JSON.stringify({
          name: "Review Flow",
          statuses: [
            { id: "draft", label: "Draft", order: 0 },
            { id: "draft", label: "Draft Again", order: 1 },
          ],
        }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'statuses contains duplicate id "draft"',
    });
  });

  it("POST returns 500 when insert throws", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "org:admin" });
    mocks.insert.mockImplementation(() => {
      throw new Error("insert failed");
    });

    const res = await POST(
      new Request("http://localhost/api/workflow-definitions", {
        method: "POST",
        body: JSON.stringify({ name: "Review Flow" }),
      })
    );

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Failed to create workflow definition",
      details: "insert failed",
    });
  });
});
