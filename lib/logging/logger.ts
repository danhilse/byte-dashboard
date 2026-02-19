import pino from "pino";

import { REQUEST_ID_HEADER } from "@/lib/request-id";
import { getLogContext } from "@/lib/logging/context";

type LogService = "api" | "worker" | "app";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_.-]+$/;
const MAX_REQUEST_ID_LENGTH = 128;
const DEFAULT_LOG_LEVEL =
  process.env.NODE_ENV === "test"
    ? "silent"
    : process.env.NODE_ENV === "production"
      ? "info"
      : "debug";

const rootLogger = pino({
  level: process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    app: "byte-dashboard",
    env: process.env.NODE_ENV ?? "development",
  },
});

function sanitizeRequestId(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_REQUEST_ID_LENGTH) {
    return undefined;
  }

  if (!REQUEST_ID_PATTERN.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

function createRequestId(): string {
  const runtimeCrypto = globalThis.crypto;

  if (runtimeCrypto?.randomUUID) {
    return runtimeCrypto.randomUUID();
  }

  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateRequestId(headers?: Pick<Headers, "get">): string {
  return sanitizeRequestId(headers?.get(REQUEST_ID_HEADER)) ?? createRequestId();
}

export function getLogger(bindings?: Record<string, unknown>) {
  const context = getLogContext();

  if (context && bindings) {
    return rootLogger.child({ ...context, ...bindings });
  }

  if (context) {
    return rootLogger.child(context);
  }

  if (bindings) {
    return rootLogger.child(bindings);
  }

  return rootLogger;
}

export function getServiceLogger(
  service: LogService | string,
  bindings?: Record<string, unknown>
) {
  return getLogger({
    service,
    ...(bindings ?? {}),
  });
}
