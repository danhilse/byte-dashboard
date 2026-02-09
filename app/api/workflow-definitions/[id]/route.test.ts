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
