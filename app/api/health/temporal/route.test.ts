/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkTemporalHealth: vi.fn(),
}));

vi.mock("@/lib/health/checks", () => ({
  checkTemporalHealth: mocks.checkTemporalHealth,
}));

import { GET } from "@/app/api/health/temporal/route";

describe("app/api/health/temporal/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when namespace is reachable", async () => {
    mocks.checkTemporalHealth.mockResolvedValue({
      status: "ok",
      namespace: "byte.xx0ph",
      namespaceState: 1,
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "ok",
      namespace: "byte.xx0ph",
      namespaceState: 1,
    });
  });

  it("returns 503 when namespace check fails", async () => {
    mocks.checkTemporalHealth.mockResolvedValue({
      status: "error",
      namespace: "default",
      error: "unavailable",
    });

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      status: "error",
      namespace: "default",
    });
  });
});
