/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getTemporalClient: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/temporal/client", () => ({
  getTemporalClient: mocks.getTemporalClient,
}));

import { GET, POST } from "@/app/api/workflows/hello/route";

describe("app/api/workflows/hello/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });
  });

  it("POST returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null, orgRole: null });

    const res = await POST(
      new Request("http://localhost/api/workflows/hello", {
        method: "POST",
        body: JSON.stringify({ name: "Ada" }),
      })
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("POST returns 403 for guest role", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:guest",
    });

    const res = await POST(
      new Request("http://localhost/api/workflows/hello", {
        method: "POST",
        body: JSON.stringify({ name: "Ada" }),
      })
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("POST returns 400 when name is missing", async () => {
    const res = await POST(
      new Request("http://localhost/api/workflows/hello", {
        method: "POST",
        body: JSON.stringify({ email: "ada@example.com" }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Name is required" });
  });

  it("POST starts workflow and returns result", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1);
    const result = { message: "Hello Ada" };
    mocks.getTemporalClient.mockResolvedValue({
      workflow: {
        start: vi.fn().mockResolvedValue({
          workflowId: "hello-org_1-user_1-1",
          result: vi.fn().mockResolvedValue(result),
        }),
      },
    });

    const res = await POST(
      new Request("http://localhost/api/workflows/hello", {
        method: "POST",
        body: JSON.stringify({ name: "Ada", email: "ada@example.com" }),
      })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      temporalWorkflowId: "hello-org_1-user_1-1",
      result,
    });
    nowSpy.mockRestore();
  });

  it("GET returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null, orgRole: null });

    const res = await GET(
      new Request("http://localhost/api/workflows/hello?temporalWorkflowId=hello-org_1-user_1-1")
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("GET returns 400 when temporalWorkflowId is missing", async () => {
    const res = await GET(new Request("http://localhost/api/workflows/hello"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "temporalWorkflowId is required" });
  });

  it("GET returns 404 when temporalWorkflowId is outside org scope", async () => {
    const res = await GET(
      new Request("http://localhost/api/workflows/hello?temporalWorkflowId=hello-org_2-user_9-1")
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Workflow not found" });
  });

  it("GET returns workflow status for a valid temporalWorkflowId", async () => {
    mocks.getTemporalClient.mockResolvedValue({
      workflow: {
        getHandle: vi.fn().mockReturnValue({
          describe: vi.fn().mockResolvedValue({
            status: { name: "RUNNING" },
            startTime: "2026-02-01T10:00:00.000Z",
          }),
        }),
      },
    });

    const res = await GET(
      new Request(
        "http://localhost/api/workflows/hello?temporalWorkflowId=hello-org_1-user_1-1"
      )
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      temporalWorkflowId: "hello-org_1-user_1-1",
      status: "RUNNING",
      startTime: "2026-02-01T10:00:00.000Z",
    });
  });
});
