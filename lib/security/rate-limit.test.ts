/** @vitest-environment node */

import { beforeEach, describe, expect, it } from "vitest";

import {
  RATE_LIMIT_POLICIES,
  checkRateLimit,
  getClientIp,
  resetRateLimitStoreForTests,
} from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  it("allows up to policy max requests and then blocks", () => {
    const now = 1_700_000_000_000;
    const { maxRequests } = RATE_LIMIT_POLICIES["api.read"];

    for (let count = 1; count <= maxRequests; count += 1) {
      const result = checkRateLimit({
        policy: "api.read",
        identifier: "org:org_1:user:user_1",
        now,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(maxRequests - count);
    }

    const blocked = checkRateLimit({
      policy: "api.read",
      identifier: "org:org_1:user:user_1",
      now,
    });

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.headers["Retry-After"]).toBeDefined();
  });

  it("resets counters in the next window", () => {
    const now = 1_700_000_000_000;

    const first = checkRateLimit({
      policy: "api.write",
      identifier: "org:org_1:user:user_1",
      now,
    });

    const second = checkRateLimit({
      policy: "api.write",
      identifier: "org:org_1:user:user_1",
      now,
    });

    const nextWindow = checkRateLimit({
      policy: "api.write",
      identifier: "org:org_1:user:user_1",
      now: now + RATE_LIMIT_POLICIES["api.write"].windowMs,
    });

    expect(first.remaining).toBe(RATE_LIMIT_POLICIES["api.write"].maxRequests - 1);
    expect(second.remaining).toBe(RATE_LIMIT_POLICIES["api.write"].maxRequests - 2);
    expect(nextWindow.allowed).toBe(true);
    expect(nextWindow.remaining).toBe(
      RATE_LIMIT_POLICIES["api.write"].maxRequests - 1
    );
  });
});

describe("getClientIp", () => {
  it("uses the first x-forwarded-for value when present", () => {
    const ip = getClientIp({
      headers: new Headers({
        "x-forwarded-for": "203.0.113.10, 198.51.100.5",
      }),
    });

    expect(ip).toBe("203.0.113.10");
  });

  it("falls back to x-real-ip and then unknown", () => {
    const fromRealIp = getClientIp({
      headers: new Headers({ "x-real-ip": "192.0.2.22" }),
    });

    const unknown = getClientIp({
      headers: new Headers(),
    });

    expect(fromRealIp).toBe("192.0.2.22");
    expect(unknown).toBe("unknown");
  });
});
