/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
  },
}));

function selectQuery(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result),
  };
}

import {
  findForbiddenContactWriteFields,
  redactContactForRead,
  resolveContactFieldAccess,
} from "@/lib/auth/field-visibility";

describe("field visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReturnValue(selectQuery([]));
  });

  it("grants member default read/write access to contact fields", async () => {
    const access = await resolveContactFieldAccess({
      orgId: "org_1",
      orgRoles: ["member"],
    });

    expect(access.readableFields.has("email")).toBe(true);
    expect(access.writableFields.has("email")).toBe(true);
  });

  it("limits guest default access for sensitive contact fields", async () => {
    const access = await resolveContactFieldAccess({
      orgId: "org_1",
      orgRoles: ["guest"],
    });

    expect(access.readableFields.has("firstName")).toBe(true);
    expect(access.readableFields.has("email")).toBe(false);
    expect(access.writableFields.size).toBe(0);
  });

  it("does not grant implicit access for unknown custom roles", async () => {
    const access = await resolveContactFieldAccess({
      orgId: "org_1",
      orgRoles: ["reviewer"],
    });

    expect(access.readableFields.size).toBe(0);
    expect(access.writableFields.size).toBe(0);
  });

  it("applies org-level custom field policies for custom roles", async () => {
    mocks.select.mockReturnValue(
      selectQuery([
        {
          orgId: "org_1",
          entityType: "contact",
          fieldKey: "email",
          roleKey: "reviewer",
          canRead: true,
          canWrite: false,
        },
      ])
    );

    const access = await resolveContactFieldAccess({
      orgId: "org_1",
      orgRoles: ["reviewer"],
    });

    expect(access.readableFields.has("email")).toBe(true);
    expect(access.writableFields.has("email")).toBe(false);
  });

  it("redacts fields not included in readable field set", () => {
    const redacted = redactContactForRead(
      {
        id: "contact_1",
        firstName: "Ada",
        email: "ada@example.com",
      },
      new Set(["firstName"])
    );

    expect(redacted.firstName).toBe("Ada");
    expect(redacted.email).toBeNull();
  });

  it("returns forbidden write fields from payload", () => {
    const forbidden = findForbiddenContactWriteFields(
      { firstName: "Ada", email: "ada@example.com" },
      new Set(["firstName"])
    );

    expect(forbidden).toEqual(["email"]);
  });
});
