/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTemporalClient: vi.fn(),
}));

vi.mock("@/lib/temporal/client", () => ({
  getTemporalClient: mocks.getTemporalClient,
}));

import { GET, POST } from "@/app/api/workflows/hello/route";

describe("app/api/workflows/hello/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    const result = { message: "Hello Ada" };
    mocks.getTemporalClient.mockResolvedValue({
      workflow: {
        start: vi.fn().mockResolvedValue({
          workflowId: "hello-ada-1",
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
      workflowId: "hello-ada-1",
      result,
    });
  });

  it("GET returns 400 when workflowId is missing", async () => {
    const res = await GET(new Request("http://localhost/api/workflows/hello"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "workflowId is required" });
  });

  it("GET returns workflow status for a valid workflowId", async () => {
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
      new Request("http://localhost/api/workflows/hello?workflowId=hello-ada-1")
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      workflowId: "hello-ada-1",
      status: "RUNNING",
      startTime: "2026-02-01T10:00:00.000Z",
    });
  });
});
