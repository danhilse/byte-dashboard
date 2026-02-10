/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  logActivity: vi.fn(),
  createTaskAssignedNotification: vi.fn(),
  normalizeTaskMetadata: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: mocks.insert,
  },
}));

vi.mock("@/lib/db/log-activity", () => ({
  logActivity: mocks.logActivity,
}));

vi.mock("@/lib/notifications/service", () => ({
  createTaskAssignedNotification: mocks.createTaskAssignedNotification,
  createWorkflowActionNotifications: vi.fn(),
}));

vi.mock("@/lib/tasks/presentation", () => ({
  normalizeTaskMetadata: mocks.normalizeTaskMetadata,
}));

import { createTask } from "@/lib/activities/database";

function createInsertQuery(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const values = vi.fn().mockReturnValue({ returning });
  return { values, returning };
}

describe("lib/activities/database createTask dueDate handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logActivity.mockResolvedValue(undefined);
    mocks.createTaskAssignedNotification.mockResolvedValue(undefined);
    mocks.normalizeTaskMetadata.mockImplementation((metadata: unknown) => metadata);
  });

  it("stores date-only value when dueDate is an ISO datetime string", async () => {
    const query = createInsertQuery([{ id: "task_1" }]);
    mocks.insert.mockReturnValue(query);

    await createTask("wf_1", {
      orgId: "org_1",
      title: "Review Application",
      dueDate: "2026-02-10T16:57:09.755Z",
    });

    expect(query.values).toHaveBeenCalledWith(
      expect.objectContaining({
        dueDate: "2026-02-10",
      })
    );
  });

  it("passes through YYYY-MM-DD dueDate strings", async () => {
    const query = createInsertQuery([{ id: "task_2" }]);
    mocks.insert.mockReturnValue(query);

    await createTask("wf_2", {
      orgId: "org_1",
      title: "Manager Approval",
      dueDate: "2026-02-14",
    });

    expect(query.values).toHaveBeenCalledWith(
      expect.objectContaining({
        dueDate: "2026-02-14",
      })
    );
  });

  it("skips invalid dueDate values instead of throwing", async () => {
    const query = createInsertQuery([{ id: "task_3" }]);
    mocks.insert.mockReturnValue(query);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      createTask("wf_3", {
        orgId: "org_1",
        title: "Invalid Date Task",
        dueDate: "not-a-date",
      })
    ).resolves.toBe("task_3");

    expect(query.values).toHaveBeenCalledWith(
      expect.objectContaining({
        dueDate: undefined,
      })
    );
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
