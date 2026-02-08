/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getWorkflowsOverTime: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/db/queries", () => ({
  getWorkflowsOverTime: mocks.getWorkflowsOverTime,
}));

import { GET } from "@/app/api/dashboard/workflows-over-time/route";

describe("app/api/dashboard/workflows-over-time/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated requests", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null });

    const res = await GET(new Request("http://localhost/api/dashboard/workflows-over-time"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when days is not numeric", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });

    const res = await GET(
      new Request("http://localhost/api/dashboard/workflows-over-time?days=abc")
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "days must be a positive integer" });
    expect(mocks.getWorkflowsOverTime).not.toHaveBeenCalled();
  });

  it("loads 30 days by default", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.getWorkflowsOverTime.mockResolvedValue([{ date: "2026-01-01", count: 3 }]);

    const res = await GET(new Request("http://localhost/api/dashboard/workflows-over-time"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: [{ date: "2026-01-01", count: 3 }],
    });
    expect(mocks.getWorkflowsOverTime).toHaveBeenCalledWith("org_1", 30);
  });

  it("clamps days query param to 90 max", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    mocks.getWorkflowsOverTime.mockResolvedValue([{ date: "2026-01-01", count: 1 }]);

    await GET(
      new Request("http://localhost/api/dashboard/workflows-over-time?days=365")
    );

    expect(mocks.getWorkflowsOverTime).toHaveBeenCalledWith("org_1", 90);
  });
});
