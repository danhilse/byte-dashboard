/** @vitest-environment node */

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import type { TaskAccessContext, TaskAccessTarget } from "./access";
import { canMutateTask } from "./access";

function makeContext(overrides: Partial<TaskAccessContext> = {}): TaskAccessContext {
  return {
    userId: "user_1",
    orgId: "org_1",
    orgRole: "member",
    roles: new Set(["member", "reviewer", "user"]),
    ...overrides,
  };
}

function makeTask(overrides: Partial<TaskAccessTarget> = {}): TaskAccessTarget {
  return {
    assignedTo: null,
    assignedRole: null,
    ...overrides,
  };
}

describe("canMutateTask", () => {
  it("allows assigned user to mutate their task", () => {
    const ctx = makeContext({ userId: "user_1" });
    const task = makeTask({ assignedTo: "user_1" });
    expect(canMutateTask(ctx, task)).toBe(true);
  });

  it("denies a different non-admin user", () => {
    const ctx = makeContext({ userId: "user_2", orgRole: "member" });
    const task = makeTask({ assignedTo: "user_1" });
    expect(canMutateTask(ctx, task)).toBe(false);
  });

  it("allows org admin to mutate any task", () => {
    const ctx = makeContext({
      userId: "admin_1",
      orgRole: "admin",
      roles: new Set(["admin", "manager", "reviewer", "member", "user"]),
    });
    const task = makeTask({ assignedTo: "user_1" });
    expect(canMutateTask(ctx, task)).toBe(true);
  });

  it("allows org admin to mutate unassigned tasks", () => {
    const ctx = makeContext({
      userId: "admin_1",
      orgRole: "admin",
      roles: new Set(["admin", "manager", "reviewer", "member", "user"]),
    });
    const task = makeTask({ assignedTo: null });
    expect(canMutateTask(ctx, task)).toBe(true);
  });
});
