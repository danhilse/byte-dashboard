/** @vitest-environment node */

import { describe, expect, it } from "vitest";

import {
  listPermissionsForRole,
  roleHasPermission,
  rolesHavePermission,
} from "./permissions";

describe("auth permissions", () => {
  it("grants full access to admin-equivalent roles", () => {
    expect(roleHasPermission("org:admin", "admin.access")).toBe(true);
    expect(roleHasPermission("owner", "workflow-definitions.write")).toBe(true);
  });

  it("grants member/user operational access but not admin or definition writes", () => {
    expect(roleHasPermission("member", "workflows.trigger")).toBe(true);
    expect(roleHasPermission("org:user", "tasks.write")).toBe(true);
    expect(roleHasPermission("member", "users.read")).toBe(true);
    expect(roleHasPermission("member", "admin.access")).toBe(false);
    expect(roleHasPermission("user", "workflow-definitions.write")).toBe(false);
    expect(roleHasPermission("member", "workflow-definitions.read_full")).toBe(
      false
    );
  });

  it("limits guest role to read-style permissions", () => {
    expect(roleHasPermission("guest", "contacts.read")).toBe(true);
    expect(roleHasPermission("guest", "users.read")).toBe(false);
    expect(roleHasPermission("guest", "tasks.write")).toBe(false);
    expect(roleHasPermission("guest", "workflows.trigger")).toBe(false);
  });

  it("does not grant implicit permissions for unknown roles", () => {
    expect(roleHasPermission("reviewer", "tasks.read")).toBe(false);
    expect(roleHasPermission("custom-role", "workflow-definitions.write")).toBe(
      false
    );
    expect(listPermissionsForRole("custom-role")).toEqual([]);
  });

  it("resolves custom-role permissions from org-specific mappings", () => {
    const customRolePermissions = new Map([
      ["reviewer", new Set(["tasks.read", "tasks.claim"] as const)],
      ["qa", new Set(["contacts.read"] as const)],
    ]);

    expect(
      roleHasPermission("reviewer", "tasks.read", { customRolePermissions })
    ).toBe(true);
    expect(
      roleHasPermission("reviewer", "tasks.write", { customRolePermissions })
    ).toBe(false);
    expect(
      rolesHavePermission(["qa", "member"], "contacts.write", {
        customRolePermissions,
      })
    ).toBe(true);
  });
});
