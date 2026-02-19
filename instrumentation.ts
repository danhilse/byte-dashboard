import { validateServerEnvironment } from "@/lib/env/server-env";

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  validateServerEnvironment();
}
