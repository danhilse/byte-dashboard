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

function transactionMocks(createdDefinition: unknown) {
  const updateReturning = vi.fn().mockResolvedValue([{ id: "def_1", isActive: false }]);
  const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  const txUpdate = vi.fn().mockReturnValue({ set: updateSet });

  const insertReturning = vi.fn().mockResolvedValue([createdDefinition]);
  const insertValues = vi.fn().mockReturnValue({ returning: insertReturning });
  const txInsert = vi.fn().mockReturnValue({ values: insertValues });

  const tx = {
    update: txUpdate,
    insert: txInsert,
  };

  return { tx, insertValues };
}

describe("app/api/workflow-definitions/[id]/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "def_1" }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("GET returns definition when found", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select.mockReturnValue(selectQuery([{ id: "def_1", name: "Definition" }]));

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "def_1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      definition: { id: "def_1", name: "Definition" },
    });
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

  it("GET returns 500 when query throws", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select.mockImplementation(() => {
      throw new Error("read failed");
    });

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "def_1" }),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Failed to fetch workflow definition",
      details: "read failed",
    });
  });

  it("PATCH returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: Promise.resolve({ id: "def_1" }) }
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("PATCH returns 404 when transactional clone finds no active definition", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select.mockReturnValue(selectQuery([]));

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

  it("PATCH returns 400 when name is invalid", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ name: "   " }),
      }),
      { params: Promise.resolve({ id: "def_1" }) }
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "name must be a non-empty string when provided",
    });
  });

  it("PATCH returns 400 when description is invalid", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ description: 42 }),
      }),
      { params: Promise.resolve({ id: "def_1" }) }
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "description must be a string when provided",
    });
  });

  it("PATCH returns 400 when statuses contain duplicate order", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({
          statuses: [
            { id: "draft", label: "Draft", order: 0 },
            { id: "approved", label: "Approved", order: 0 },
          ],
        }),
      }),
      { params: Promise.resolve({ id: "def_1" }) }
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'statuses contains duplicate order "0"',
    });
  });

  it("PATCH returns 400 when authoring payload fails compile validation", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select.mockReturnValue(
      selectQuery([
        {
          id: "def_1",
          orgId: "org_1",
          name: "Definition",
          description: null,
          version: 1,
          steps: [],
          phases: [],
          variables: {},
          statuses: [{ id: "draft", label: "Draft", order: 0 }],
          isActive: true,
          createdAt: new Date("2026-02-09T00:00:00.000Z"),
          updatedAt: new Date("2026-02-09T00:00:00.000Z"),
        },
      ])
    );

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({
          variables: {
            __builderV2Authoring: {
              schemaVersion: 1,
              workflow: {
                trigger: { type: "manual" },
                contactRequired: true,
                phases: [],
                variables: [],
                steps: [
                  {
                    id: "step_1",
                    name: "Unsupported Step",
                    actions: [
                      {
                        type: "create_contact",
                        id: "action_1",
                        config: { contactType: "reference", fields: [] },
                      },
                    ],
                    advancementCondition: { type: "automatic" },
                  },
                ],
              },
            },
          },
        }),
      }),
      { params: Promise.resolve({ id: "def_1" }) }
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: "Authoring validation failed",
    });
  });

  it("PATCH returns 400 when authoring payload is missing", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select.mockReturnValue(
      selectQuery([
        {
          id: "def_1",
          orgId: "org_1",
          name: "Definition",
          description: null,
          version: 1,
          steps: [],
          phases: [],
          variables: {},
          statuses: [{ id: "draft", label: "Draft", order: 0 }],
          isActive: true,
          createdAt: new Date("2026-02-09T00:00:00.000Z"),
          updatedAt: new Date("2026-02-09T00:00:00.000Z"),
        },
      ])
    );

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: Promise.resolve({ id: "def_1" }) }
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error:
        "authoring payload is required on variables.__builderV2Authoring for workflow definition saves",
    });
  });

  it("PATCH returns 400 when existing statuses are invalid", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select.mockReturnValue(
      selectQuery([
        {
          id: "def_1",
          orgId: "org_1",
          name: "Definition",
          description: null,
          version: 1,
          steps: [],
          phases: [],
          variables: {
            __builderV2Authoring: {
              schemaVersion: 1,
              workflow: {
                trigger: { type: "manual" },
                contactRequired: true,
                phases: [],
                variables: [],
                steps: [],
              },
            },
          },
          statuses: [{ id: "draft", label: "Draft", order: "oops" }],
          isActive: true,
          createdAt: new Date("2026-02-09T00:00:00.000Z"),
          updatedAt: new Date("2026-02-09T00:00:00.000Z"),
        },
      ])
    );

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: Promise.resolve({ id: "def_1" }) }
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "statuses must be a valid DefinitionStatus[] when provided",
    });
  });

  it("PATCH rejects direct steps writes", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ steps: [] }),
      }),
      { params: Promise.resolve({ id: "def_1" }) }
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error:
        "direct steps writes are not supported; use authoring payload through the workflow builder editor",
    });
  });

  it("PATCH compiles authoring and creates a new immutable version", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select.mockReturnValue(
      selectQuery([
        {
          id: "def_1",
          orgId: "org_1",
          name: "Definition",
          description: null,
          version: 1,
          steps: [],
          phases: [],
          variables: {},
          statuses: [
            { id: "draft", label: "Draft", order: 0 },
            { id: "approved", label: "Approved", order: 1 },
          ],
          isActive: true,
          createdAt: new Date("2026-02-09T00:00:00.000Z"),
          updatedAt: new Date("2026-02-09T00:00:00.000Z"),
        },
      ])
    );

    const createdDefinition = { id: "def_2", version: 2, isActive: true };
    const { tx, insertValues } = transactionMocks(createdDefinition);
    mocks.transaction.mockImplementation(async (fn: (txArg: unknown) => Promise<unknown>) =>
      fn(tx)
    );

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Updated Definition",
          variables: {
            __builderV2Authoring: {
              schemaVersion: 1,
              workflow: {
                trigger: { type: "manual" },
                contactRequired: true,
                phases: [],
                variables: [],
                steps: [
                  {
                    id: "step_1",
                    name: "Notify",
                    actions: [
                      {
                        type: "send_email",
                        id: "email_1",
                        config: {
                          to: "var-contact.email",
                          subject: "Hello",
                          body: "Body",
                        },
                      },
                    ],
                    advancementCondition: { type: "automatic" },
                  },
                ],
              },
            },
          },
          statuses: [
            { id: "draft", label: "Draft", order: 0 },
            { id: "approved", label: "Approved", order: 1 },
          ],
        }),
      }),
      { params: Promise.resolve({ id: "def_1" }) }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ definition: createdDefinition });

    const insertPayload = insertValues.mock.calls[0][0] as {
      steps: Array<{ type: string }>
      version: number
      name: string
    };
    expect(insertPayload.version).toBe(2);
    expect(insertPayload.name).toBe("Updated Definition");
    expect(insertPayload.steps.length).toBeGreaterThan(0);
    expect(insertPayload.steps[0].type).toBe("trigger");
    expect(insertPayload.steps.some((step) => step.type === "send_email")).toBe(true);
  });

  it("PATCH returns 404 when active row was already deactivated in transaction", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select.mockReturnValue(
      selectQuery([
        {
          id: "def_1",
          orgId: "org_1",
          name: "Definition",
          description: null,
          version: 1,
          steps: [],
          phases: [],
          variables: {
            __builderV2Authoring: {
              schemaVersion: 1,
              workflow: {
                trigger: { type: "manual" },
                contactRequired: true,
                phases: [],
                variables: [],
                steps: [],
              },
            },
          },
          statuses: [{ id: "draft", label: "Draft", order: 0 }],
          isActive: true,
          createdAt: new Date("2026-02-09T00:00:00.000Z"),
          updatedAt: new Date("2026-02-09T00:00:00.000Z"),
        },
      ])
    );

    const updateReturning = vi.fn().mockResolvedValue([]);
    const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    const txUpdate = vi.fn().mockReturnValue({ set: updateSet });
    const txInsert = vi.fn();

    mocks.transaction.mockImplementation(async (fn: (txArg: unknown) => Promise<unknown>) =>
      fn({
        update: txUpdate,
        insert: txInsert,
      })
    );

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({
          variables: {
            __builderV2Authoring: {
              schemaVersion: 1,
              workflow: {
                trigger: { type: "manual" },
                contactRequired: true,
                phases: [],
                variables: [],
                steps: [],
              },
            },
          },
        }),
      }),
      { params: Promise.resolve({ id: "def_1" }) }
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Workflow definition not found" });
    expect(txInsert).not.toHaveBeenCalled();
  });

  it("PATCH returns 500 when transaction throws", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select.mockReturnValue(
      selectQuery([
        {
          id: "def_1",
          orgId: "org_1",
          name: "Definition",
          description: null,
          version: 1,
          steps: [],
          phases: [],
          variables: {
            __builderV2Authoring: {
              schemaVersion: 1,
              workflow: {
                trigger: { type: "manual" },
                contactRequired: true,
                phases: [],
                variables: [],
                steps: [],
              },
            },
          },
          statuses: [{ id: "draft", label: "Draft", order: 0 }],
          isActive: true,
          createdAt: new Date("2026-02-09T00:00:00.000Z"),
          updatedAt: new Date("2026-02-09T00:00:00.000Z"),
        },
      ])
    );
    mocks.transaction.mockRejectedValue(new Error("tx failed"));

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({
          variables: {
            __builderV2Authoring: {
              schemaVersion: 1,
              workflow: {
                trigger: { type: "manual" },
                contactRequired: true,
                phases: [],
                variables: [],
                steps: [],
              },
            },
          },
        }),
      }),
      { params: Promise.resolve({ id: "def_1" }) }
    );

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Failed to update workflow definition",
      details: "tx failed",
    });
  });

  it("DELETE returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "def_1" }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
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

  it("DELETE returns 404 when row is not found", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    const q = updateQuery([]);
    mocks.update.mockReturnValue({ set: q.set });

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "def_missing" }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Workflow definition not found" });
  });

  it("DELETE returns 500 when update throws", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.update.mockImplementation(() => {
      throw new Error("delete failed");
    });

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "def_1" }),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Failed to delete workflow definition",
      details: "delete failed",
    });
  });
});
