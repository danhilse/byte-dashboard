import * as Sentry from "@sentry/nextjs";

import { validateServerEnvironment } from "@/lib/env/server-env";

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
    return;
  }

  await import("./sentry.server.config");
  validateServerEnvironment();
}

export const onRequestError = Sentry.captureRequestError;
