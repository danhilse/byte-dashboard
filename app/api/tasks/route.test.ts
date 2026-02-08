/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  logActivity: vi.fn(),
  buildTaskAccessContext: vi.fn(),
  canClaimTask: vi.fn(),
  canMutateTask: vi.fn(),
  normalizeRoleName: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
  },
}));

vi.mock("@/lib/db/log-activity", () => ({
  logActivity: mocks.logActivity,
}));

vi.mock("@/lib/tasks/access", () => ({
  buildTaskAccessContext: mocks.buildTaskAccessContext,
  canClaimTask: mocks.canClaimTask,
  canMutateTask: mocks.canMutateTask,
  normalizeRoleName: mocks.normalizeRoleName,
}));

import { GET, POST } from "@/app/api/tasks/route";

function createTaskListQuery(rows: unknown[]) {
  const query = {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(rows),
  };
  return query;
}

function createSimpleSelectQuery(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(result),
  };
}

function createInsertQuery(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const values = vi.fn().mockReturnValue({ returning });
  return { values, returning };
}

describe("app/api/tasks/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logActivity.mockResolvedValue(undefined);
    mocks.buildTaskAccessContext.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "member",
      roles: new Set(["member"]),
    });
    mocks.normalizeRoleName.mockImplementation((role: string | null | undefined) =>
      role ? role.trim().toLowerCase() : null
    );
  });

  it("returns 401 for unauthenticated GET requests", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await GET(new Request("http://localhost/api/tasks"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("returns 403 when assignee filter targets a different user", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });

    const res = await GET(
      new Request("http://localhost/api/tasks?assignee=another_user")
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "assignee filter can only target the authenticated user",
    });
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("returns only tasks mutable by the current user by default", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    const query = createTaskListQuery([
      {
        task: { id: "task_1", status: "todo", assignedTo: "user_1", assignedRole: "member" },
        contactFirstName: "Ada",
        contactLastName: "Lovelace",
        workflowStatus: "running",
      },
      {
        task: { id: "task_2", status: "todo", assignedTo: "user_2", assignedRole: "member" },
        contactFirstName: "Grace",
        contactLastName: "Hopper",
        workflowStatus: "running",
      },
    ]);
    mocks.select.mockReturnValue(query);
    mocks.canMutateTask.mockImplementation((context: { userId: string }, task: { assignedTo?: string }) => {
      return task.assignedTo === context.userId;
    });

    const res = await GET(new Request("http://localhost/api/tasks"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      tasks: [
        {
          id: "task_1",
          status: "todo",
          assignedTo: "user_1",
          assignedRole: "member",
          contactName: "Ada Lovelace",
        },
      ],
    });
    expect(mocks.canClaimTask).not.toHaveBeenCalled();
  });

  it("returns claimable tasks for available view", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1", orgRole: "member" });
    const query = createTaskListQuery([
      {
        task: { id: "task_1", status: "todo", assignedTo: null, assignedRole: "reviewer" },
        contactFirstName: "Ada",
        contactLastName: "Lovelace",
        workflowStatus: "running",
      },
      {
        task: { id: "task_2", status: "todo", assignedTo: "user_1", assignedRole: "reviewer" },
        contactFirstName: "Grace",
        contactLastName: "Hopper",
        workflowStatus: "running",
      },
    ]);
    mocks.select.mockReturnValue(query);
    mocks.canClaimTask.mockReturnValueOnce(true).mockReturnValueOnce(false);

    const res = await GET(new Request("http://localhost/api/tasks?available=true"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      tasks: [
        {
          id: "task_1",
          status: "todo",
          assignedTo: null,
          assignedRole: "reviewer",
          contactName: "Ada Lovelace",
        },
      ],
    });
    expect(mocks.canMutateTask).not.toHaveBeenCalled();
  });

  it("returns 400 when title is missing on POST", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });

    const res = await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({ priority: "high" }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "title is required" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("returns 404 when the provided contact is not in org", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select.mockReturnValueOnce(createSimpleSelectQuery([]));

    const res = await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: "Review docs", contactId: "contact_missing" }),
      })
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Contact not found" });
  });

  it("creates a task and logs activity", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.select
      .mockReturnValueOnce(createSimpleSelectQuery([{ id: "contact_1" }]))
      .mockReturnValueOnce(createSimpleSelectQuery([{ id: "workflow_1" }]));

    const insertQuery = createInsertQuery([
      { id: "task_1", title: "Review docs", status: "todo", priority: "medium" },
    ]);
    mocks.insert.mockReturnValue({ values: insertQuery.values });

    const res = await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: "Review docs",
          contactId: "contact_1",
          workflowId: "workflow_1",
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      task: { id: "task_1", title: "Review docs", status: "todo", priority: "medium" },
    });
    expect(insertQuery.values).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_1",
        title: "Review docs",
        status: "todo",
        priority: "medium",
        taskType: "standard",
        metadata: {},
      })
    );
    expect(mocks.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_1",
        userId: "user_1",
        entityType: "task",
        entityId: "task_1",
        action: "created",
      })
    );
  });
});
