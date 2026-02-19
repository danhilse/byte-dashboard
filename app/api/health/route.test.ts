/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkAppHealth: vi.fn(),
  checkDatabaseHealth: vi.fn(),
  checkTemporalHealth: vi.fn(),
}));

vi.mock("@/lib/health/checks", () => ({
  checkAppHealth: mocks.checkAppHealth,
  checkDatabaseHealth: mocks.checkDatabaseHealth,
  checkTemporalHealth: mocks.checkTemporalHealth,
}));

import { GET } from "@/app/api/health/route";

describe("app/api/health/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when app, db, and temporal checks are healthy", async () => {
    mocks.checkAppHealth.mockReturnValue({
      status: "ok",
      latencyMs: 1,
      runtime: "nodejs",
      nodeEnv: "production",
    });
    mocks.checkDatabaseHealth.mockResolvedValue({
      status: "ok",
      latencyMs: 3,
    });
    mocks.checkTemporalHealth.mockResolvedValue({
      status: "ok",
      latencyMs: 4,
      namespace: "default",
      address: "localhost:7233",
      namespaceState: 1,
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        status: "ok",
        checks: {
          app: {
            status: "ok",
            latencyMs: 1,
            runtime: "nodejs",
            nodeEnv: "production",
          },
          db: {
            status: "ok",
            latencyMs: 3,
          },
          temporal: {
            status: "ok",
            latencyMs: 4,
            namespace: "default",
            address: "localhost:7233",
            namespaceState: 1,
          },
        },
      })
    );
    expect(typeof body.timestamp).toBe("string");
  });

  it("returns 503 when any dependency check fails", async () => {
    mocks.checkAppHealth.mockReturnValue({
      status: "ok",
      latencyMs: 1,
      runtime: "nodejs",
      nodeEnv: "production",
    });
    mocks.checkDatabaseHealth.mockResolvedValue({
      status: "error",
      latencyMs: 2,
      error: "database unavailable",
    });
    mocks.checkTemporalHealth.mockResolvedValue({
      status: "ok",
      latencyMs: 5,
      namespace: "default",
      address: "localhost:7233",
      namespaceState: 1,
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("error");
    expect(body.checks.db).toEqual({
      status: "error",
      latencyMs: 2,
      error: "database unavailable",
    });
  });
});
