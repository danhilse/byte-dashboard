import { lt, sql } from "drizzle-orm";

import {
  RATE_LIMIT_POLICIES,
  checkRateLimit,
  type RateLimitCheckInput,
  type RateLimitCheckResult,
} from "@/lib/security/rate-limit";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

const CLEANUP_INTERVAL_MS = parsePositiveInt(
  process.env.RATE_LIMIT_DB_CLEANUP_INTERVAL_MS,
  60_000
);
const GLOBAL_CLEANUP_STATE_KEY = "__byteDashboardGlobalRateLimitCleanupAt";

type CleanupStateScope = typeof globalThis & {
  [GLOBAL_CLEANUP_STATE_KEY]?: number;
};

function shouldRunCleanup(now: number): boolean {
  const scope = globalThis as CleanupStateScope;
  const nextCleanupAt = scope[GLOBAL_CLEANUP_STATE_KEY] ?? 0;

  if (now < nextCleanupAt) {
    return false;
  }

  scope[GLOBAL_CLEANUP_STATE_KEY] = now + CLEANUP_INTERVAL_MS;
  return true;
}

function toRateLimitResult(
  input: RateLimitCheckInput,
  requestCount: number,
  now: number
): RateLimitCheckResult {
  const policy = RATE_LIMIT_POLICIES[input.policy];
  const windowStart = Math.floor(now / policy.windowMs) * policy.windowMs;
  const resetAt = windowStart + policy.windowMs;
  const allowed = requestCount <= policy.maxRequests;
  const remaining = Math.max(policy.maxRequests - requestCount, 0);
  const retryAfterSeconds = Math.max(Math.ceil((resetAt - now) / 1000), 1);

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(policy.maxRequests),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.floor(resetAt / 1000)),
  };

  if (!allowed) {
    headers["Retry-After"] = String(retryAfterSeconds);
  }

  return {
    allowed,
    limit: policy.maxRequests,
    remaining,
    resetAtUnixSeconds: Math.floor(resetAt / 1000),
    retryAfterSeconds,
    headers,
  };
}

export async function checkGlobalRateLimit(
  input: RateLimitCheckInput
): Promise<RateLimitCheckResult> {
  const now = input.now ?? Date.now();
  const policy = RATE_LIMIT_POLICIES[input.policy];

  if (!policy) {
    throw new Error(`Unknown rate-limit policy: ${input.policy}`);
  }

  const windowStart = Math.floor(now / policy.windowMs) * policy.windowMs;
  const expiresAt = new Date(windowStart + policy.windowMs);

  try {
    const [{ db }, { rateLimitCounters }] = await Promise.all([
      import("@/lib/db"),
      import("@/lib/db/schema"),
    ]);

    if (shouldRunCleanup(now)) {
      await db
        .delete(rateLimitCounters)
        .where(lt(rateLimitCounters.expiresAt, new Date(now)));
    }

    const rows = await db
      .insert(rateLimitCounters)
      .values({
        policy: input.policy,
        identifier: input.identifier,
        windowStartMs: windowStart,
        requestCount: 1,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [
          rateLimitCounters.policy,
          rateLimitCounters.identifier,
          rateLimitCounters.windowStartMs,
        ],
        set: {
          requestCount: sql`${rateLimitCounters.requestCount} + 1`,
          expiresAt,
          updatedAt: new Date(now),
        },
      })
      .returning({ requestCount: rateLimitCounters.requestCount });

    const requestCount = rows[0]?.requestCount ?? policy.maxRequests + 1;

    return toRateLimitResult(input, requestCount, now);
  } catch (error) {
    console.error("Global rate limiter unavailable, falling back to in-memory limiter:", error);
    return checkRateLimit({ ...input, now });
  }
}
