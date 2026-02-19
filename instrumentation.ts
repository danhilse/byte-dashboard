import * as Sentry from "@sentry/nextjs";

import { validateServerEnvironment } from "@/lib/env/server-env";
import { patchConsoleWithStructuredLogger } from "@/lib/logging/console-bridge";

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
    return;
  }

  if (process.env.NODE_ENV !== "test") {
    patchConsoleWithStructuredLogger("api");
  }
  await import("./sentry.server.config");
  validateServerEnvironment();
}

export const onRequestError = Sentry.captureRequestError;
