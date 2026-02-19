import { AsyncLocalStorage } from "node:async_hooks";

export type LogContext = Record<string, unknown>;

const logContextStore = new AsyncLocalStorage<LogContext>();

export function getLogContext(): LogContext | undefined {
  return logContextStore.getStore();
}

export async function runWithLogContext<T>(
  bindings: LogContext,
  callback: () => Promise<T> | T
): Promise<T> {
  const current = logContextStore.getStore();
  const nextContext = current ? { ...current, ...bindings } : bindings;
  return await logContextStore.run(nextContext, callback);
}
