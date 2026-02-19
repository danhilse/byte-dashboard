import * as Sentry from "@sentry/nextjs";

import { validateServerEnvironment } from "@/lib/env/server-env";

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
    return;
  }

  if (process.env.NODE_ENV !== "test") {
    const { patchConsoleWithStructuredLogger } = await import(
      "@/lib/logging/console-bridge"
    );
    patchConsoleWithStructuredLogger("api");
  }
  await import("./sentry.server.config");
  validateServerEnvironment();
}

export const onRequestError = Sentry.captureRequestError;
