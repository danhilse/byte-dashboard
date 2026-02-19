/** @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateServerEnvironment: vi.fn(),
}));

vi.mock("@/lib/env/server-env", () => ({
  validateServerEnvironment: mocks.validateServerEnvironment,
}));

import { register } from "@/instrumentation";

const ORIGINAL_NEXT_RUNTIME = process.env.NEXT_RUNTIME;

describe("instrumentation register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NEXT_RUNTIME = ORIGINAL_NEXT_RUNTIME;
  });

  it("validates env in node runtime", async () => {
    process.env.NEXT_RUNTIME = "nodejs";

    await register();

    expect(mocks.validateServerEnvironment).toHaveBeenCalledTimes(1);
  });

  it("skips env validation in edge runtime", async () => {
    process.env.NEXT_RUNTIME = "edge";

    await register();

    expect(mocks.validateServerEnvironment).not.toHaveBeenCalled();
  });
});
