/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
    delete: mocks.delete,
  },
}));

function selectQuery(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result),
  };
}

function insertQuery() {
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
  return { values, onConflictDoUpdate };
}

function deleteQuery() {
  const where = vi.fn().mockResolvedValue(undefined);
  return { where };
}

import {
  deleteOrganizationRoleDefinition,
  getOrganizationRolePermissionMap,
  listOrganizationRoleDefinitions,
  upsertOrganizationRoleDefinition,
} from "@/lib/auth/role-definitions";

describe("role definitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sanitizes invalid permissions when listing org role definitions", async () => {
    mocks.select.mockReturnValue(
      selectQuery([
        {
          orgId: "org_1",
          roleKey: "reviewer",
          displayName: "Reviewer",
          permissions: ["tasks.read", "invalid.permission"],
          isSystem: false,
        },
      ])
    );

    const result = await listOrganizationRoleDefinitions("org_1");

    expect(result).toEqual([
      {
        orgId: "org_1",
        roleKey: "reviewer",
        displayName: "Reviewer",
        permissions: ["tasks.read"],
        isSystem: false,
      },
    ]);
  });

  it("returns org role permission map with sanitized permissions", async () => {
    mocks.select.mockReturnValue(
      selectQuery([
        {
          orgId: "org_1",
          roleKey: "reviewer",
          displayName: "Reviewer",
          permissions: ["tasks.read", "unknown.permission"],
          isSystem: false,
        },
        {
          orgId: "org_1",
          roleKey: "analyst",
          displayName: "Analyst",
          permissions: ["contacts.read"],
          isSystem: false,
        },
      ])
    );

    const roleMap = await getOrganizationRolePermissionMap("org_1");

    expect(roleMap.get("reviewer")).toEqual(new Set(["tasks.read"]));
    expect(roleMap.get("analyst")).toEqual(new Set(["contacts.read"]));
  });

  it("validates required role key and display name for upsert", async () => {
    await expect(
      upsertOrganizationRoleDefinition({
        orgId: "org_1",
        roleKey: "  ",
        displayName: "Reviewer",
        permissions: [],
      })
    ).rejects.toThrow("roleKey is required");

    await expect(
      upsertOrganizationRoleDefinition({
        orgId: "org_1",
        roleKey: "reviewer",
        displayName: "  ",
        permissions: [],
      })
    ).rejects.toThrow("displayName is required");
  });

  it("normalizes role keys and permissions on upsert", async () => {
    const query = insertQuery();
    mocks.insert.mockReturnValue({ values: query.values });

    const result = await upsertOrganizationRoleDefinition({
      orgId: "org_1",
      roleKey: "ORG:Reviewer",
      displayName: " Reviewer ",
      permissions: ["tasks.read", "tasks.read", "invalid.permission"],
    });

    expect(result).toEqual({
      orgId: "org_1",
      roleKey: "reviewer",
      displayName: "Reviewer",
      permissions: ["tasks.read"],
      isSystem: false,
    });
    expect(query.values).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_1",
        roleKey: "reviewer",
        displayName: "Reviewer",
        permissions: ["tasks.read"],
        isSystem: false,
      })
    );
    expect(query.onConflictDoUpdate).toHaveBeenCalledTimes(1);
  });

  it("does not issue delete for blank role keys", async () => {
    await deleteOrganizationRoleDefinition("org_1", "  ");

    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("normalizes role key before delete", async () => {
    const query = deleteQuery();
    mocks.delete.mockReturnValue({ where: query.where });

    await deleteOrganizationRoleDefinition("org_1", "ORG:Reviewer");

    expect(mocks.delete).toHaveBeenCalledTimes(1);
    expect(query.where).toHaveBeenCalledTimes(1);
  });
});
