import { getServiceLogger } from "@/lib/logging/logger";

type ConsoleLevel = "debug" | "info" | "warn" | "error";

const PATCHED_FLAG = "__BYTE_DASHBOARD_CONSOLE_PATCHED__";
const ORIGINAL_CONSOLE_FLAG = "__BYTE_DASHBOARD_ORIGINAL_CONSOLE__";

function formatConsoleArgs(args: unknown[]): {
  msg: string;
  payload: Record<string, unknown>;
} {
  const payload: Record<string, unknown> = {};
  const values = [...args];

  const firstError = values.find((value): value is Error => value instanceof Error);
  if (firstError) {
    payload.err = firstError;
  }

  const nonErrorValues = values.filter((value) => !(value instanceof Error));
  const firstValue = nonErrorValues[0];

  if (typeof firstValue === "string") {
    const msg = firstValue;
    const extra = nonErrorValues.slice(1);
    if (extra.length === 1) {
      payload.context = extra[0];
    } else if (extra.length > 1) {
      payload.context = extra;
    }
    return { msg, payload };
  }

  if (nonErrorValues.length === 1) {
    payload.context = nonErrorValues[0];
  } else if (nonErrorValues.length > 1) {
    payload.context = nonErrorValues;
  }

  return {
    msg: firstError?.message ?? "console output",
    payload,
  };
}

function createConsoleMethod(level: ConsoleLevel, service: string) {
  return (...args: unknown[]) => {
    const logger = getServiceLogger(service);
    const { msg, payload } = formatConsoleArgs(args);
    logger[level](payload, msg);
  };
}

export function patchConsoleWithStructuredLogger(service: string): void {
  const globalScope = globalThis as Record<string, unknown>;

  if (globalScope[PATCHED_FLAG]) {
    return;
  }

  globalScope[ORIGINAL_CONSOLE_FLAG] = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  console.log = createConsoleMethod("info", service);
  console.info = createConsoleMethod("info", service);
  console.warn = createConsoleMethod("warn", service);
  console.error = createConsoleMethod("error", service);
  console.debug = createConsoleMethod("debug", service);

  globalScope[PATCHED_FLAG] = true;
}
