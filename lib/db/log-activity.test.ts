/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { insert: mocks.insert },
}));

// We need to import after mocks are set up
import { logActivity } from "./log-activity";

function captureInsert() {
  const values = vi.fn().mockResolvedValue(undefined);
  mocks.insert.mockReturnValue({ values });
  return values;
}

describe("logActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets contactId soft FK for non-delete contact actions", async () => {
    const values = captureInsert();

    await logActivity({
      orgId: "org_1",
      userId: "user_1",
      entityType: "contact",
      entityId: "contact_123",
      action: "updated",
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: "contact_123" })
    );
  });

  it("does NOT set contactId soft FK for delete actions (contact row already gone)", async () => {
    const values = captureInsert();

    await logActivity({
      orgId: "org_1",
      userId: "user_1",
      entityType: "contact",
      entityId: "contact_123",
      action: "deleted",
      details: { firstName: "Jane", lastName: "Doe" },
    });

    expect(values).toHaveBeenCalledTimes(1);
    const inserted = values.mock.calls[0][0];
    expect(inserted.contactId).toBeUndefined();
    // entityId should still record what was deleted
    expect(inserted.entityId).toBe("contact_123");
    expect(inserted.entityType).toBe("contact");
  });

  it("does NOT set workflowId soft FK for delete actions", async () => {
    const values = captureInsert();

    await logActivity({
      orgId: "org_1",
      userId: "user_1",
      entityType: "workflow",
      entityId: "wf_123",
      action: "deleted",
    });

    const inserted = values.mock.calls[0][0];
    expect(inserted.workflowId).toBeUndefined();
    expect(inserted.entityId).toBe("wf_123");
  });

  it("does NOT set taskId soft FK for delete actions", async () => {
    const values = captureInsert();

    await logActivity({
      orgId: "org_1",
      userId: "user_1",
      entityType: "task",
      entityId: "task_123",
      action: "deleted",
    });

    const inserted = values.mock.calls[0][0];
    expect(inserted.taskId).toBeUndefined();
    expect(inserted.entityId).toBe("task_123");
  });

  it("sets workflowId soft FK for non-delete workflow actions", async () => {
    const values = captureInsert();

    await logActivity({
      orgId: "org_1",
      userId: "user_1",
      entityType: "workflow",
      entityId: "wf_123",
      action: "created",
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ workflowId: "wf_123" })
    );
  });
});
