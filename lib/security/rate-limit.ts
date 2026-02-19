export interface RateLimitPolicy {
  windowMs: number;
  maxRequests: number;
}

function parsePositiveIntEnv(varName: string, fallback: number): number {
  const raw = process.env[varName];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export const RATE_LIMIT_POLICIES = {
  "api.ip": {
    windowMs: parsePositiveIntEnv("RATE_LIMIT_API_IP_WINDOW_MS", 60_000),
    maxRequests: parsePositiveIntEnv("RATE_LIMIT_API_IP_MAX", 240),
  },
  "api.webhook": {
    windowMs: parsePositiveIntEnv("RATE_LIMIT_API_WEBHOOK_WINDOW_MS", 60_000),
    maxRequests: parsePositiveIntEnv("RATE_LIMIT_API_WEBHOOK_MAX", 60),
  },
  "api.read": {
    windowMs: parsePositiveIntEnv("RATE_LIMIT_API_READ_WINDOW_MS", 60_000),
    maxRequests: parsePositiveIntEnv("RATE_LIMIT_API_READ_MAX", 180),
  },
  "api.write": {
    windowMs: parsePositiveIntEnv("RATE_LIMIT_API_WRITE_WINDOW_MS", 60_000),
    maxRequests: parsePositiveIntEnv("RATE_LIMIT_API_WRITE_MAX", 90),
  },
  "api.admin": {
    windowMs: parsePositiveIntEnv("RATE_LIMIT_API_ADMIN_WINDOW_MS", 60_000),
    maxRequests: parsePositiveIntEnv("RATE_LIMIT_API_ADMIN_MAX", 60),
  },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitPolicyName = keyof typeof RATE_LIMIT_POLICIES;

interface RateLimitCounter {
  count: number;
  resetAt: number;
}

interface RateLimitStore {
  counters: Map<string, RateLimitCounter>;
  lastSweepAt: number;
}

const GLOBAL_STORE_KEY = "__byteDashboardRateLimitStore";
const MAX_STORE_ENTRIES = parsePositiveIntEnv("RATE_LIMIT_MAX_ENTRIES", 20_000);
const SWEEP_INTERVAL_MS = parsePositiveIntEnv("RATE_LIMIT_SWEEP_INTERVAL_MS", 15_000);

type GlobalWithRateLimitStore = typeof globalThis & {
  [GLOBAL_STORE_KEY]?: RateLimitStore;
};

function getRateLimitStore(): RateLimitStore {
  const scope = globalThis as GlobalWithRateLimitStore;

  if (!scope[GLOBAL_STORE_KEY]) {
    scope[GLOBAL_STORE_KEY] = {
      counters: new Map<string, RateLimitCounter>(),
      lastSweepAt: 0,
    };
  }

  return scope[GLOBAL_STORE_KEY];
}

function sweepExpiredEntries(store: RateLimitStore, now: number): void {
  const needsSweep =
    now - store.lastSweepAt >= SWEEP_INTERVAL_MS ||
    store.counters.size > MAX_STORE_ENTRIES;

  if (!needsSweep) {
    return;
  }

  for (const [counterKey, counter] of store.counters.entries()) {
    if (counter.resetAt <= now) {
      store.counters.delete(counterKey);
    }
  }

  if (store.counters.size > MAX_STORE_ENTRIES) {
    const overflow = store.counters.size - MAX_STORE_ENTRIES;
    let removed = 0;

    for (const counterKey of store.counters.keys()) {
      store.counters.delete(counterKey);
      removed += 1;
      if (removed >= overflow) {
        break;
      }
    }
  }

  store.lastSweepAt = now;
}

export function isRateLimitingEnabled(): boolean {
  return process.env.ENABLE_API_RATE_LIMIT !== "false";
}

export interface RateLimitCheckInput {
  policy: RateLimitPolicyName;
  identifier: string;
  now?: number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtUnixSeconds: number;
  retryAfterSeconds: number;
  headers: Record<string, string>;
}

export function checkRateLimit(input: RateLimitCheckInput): RateLimitCheckResult {
  const now = input.now ?? Date.now();
  const policy = RATE_LIMIT_POLICIES[input.policy];

  if (!policy) {
    throw new Error(`Unknown rate-limit policy: ${input.policy}`);
  }

  const windowStart = Math.floor(now / policy.windowMs) * policy.windowMs;
  const resetAt = windowStart + policy.windowMs;
  const counterKey = `${input.policy}:${input.identifier}:${windowStart}`;

  const store = getRateLimitStore();
  sweepExpiredEntries(store, now);

  const counter = store.counters.get(counterKey);
  const count = counter ? counter.count + 1 : 1;

  store.counters.set(counterKey, {
    count,
    resetAt,
  });

  const allowed = count <= policy.maxRequests;
  const remaining = Math.max(policy.maxRequests - count, 0);
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

export function addRateLimitHeaders(
  headers: Headers,
  rateLimitHeaders: Record<string, string>
): void {
  for (const [key, value] of Object.entries(rateLimitHeaders)) {
    headers.set(key, value);
  }
}

export function getClientIp(request: Pick<Request, "headers">): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(",")
      .map((segment) => segment.trim())
      .find((segment) => segment.length > 0);

    if (firstIp) {
      return firstIp;
    }
  }

  const directIp =
    request.headers.get("x-real-ip") ?? request.headers.get("cf-connecting-ip");

  if (directIp && directIp.trim().length > 0) {
    return directIp.trim();
  }

  return "unknown";
}

export function getAuthenticatedRateLimitIdentifier(userId: string, orgId?: string): string {
  if (!orgId) {
    return `user:${userId}`;
  }

  return `org:${orgId}:user:${userId}`;
}

export function resetRateLimitStoreForTests(): void {
  const scope = globalThis as GlobalWithRateLimitStore;
  delete scope[GLOBAL_STORE_KEY];
}
