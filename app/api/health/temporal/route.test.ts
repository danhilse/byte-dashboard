/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTemporalClient: vi.fn(),
  describeNamespace: vi.fn(),
}));

vi.mock("@/lib/temporal/client", () => ({
  getTemporalClient: mocks.getTemporalClient,
}));

import { GET } from "@/app/api/health/temporal/route";

describe("app/api/health/temporal/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.TEMPORAL_NAMESPACE;
  });

  it("returns 200 when namespace is reachable", async () => {
    process.env.TEMPORAL_NAMESPACE = "byte.xx0ph";
    mocks.describeNamespace.mockResolvedValue({
      namespaceInfo: { state: 1 },
    });
    mocks.getTemporalClient.mockResolvedValue({
      connection: {
        workflowService: {
          describeNamespace: mocks.describeNamespace,
        },
      },
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(mocks.describeNamespace).toHaveBeenCalledWith({
      namespace: "byte.xx0ph",
    });
    expect(await res.json()).toEqual({
      status: "ok",
      namespace: "byte.xx0ph",
      namespaceState: 1,
    });
  });

  it("returns 503 when namespace check fails", async () => {
    mocks.getTemporalClient.mockRejectedValue(new Error("unavailable"));

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      status: "error",
      namespace: "default",
    });
  });
});
