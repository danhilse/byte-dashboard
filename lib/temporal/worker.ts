/**
 * Temporal Worker Configuration
 *
 * Workers execute workflow and activity code. In production, workers run on Railway,
 * separate from the Next.js app on Vercel (which only starts workflows via API routes).
 *
 * This file will be used by a separate worker process (future workers/ package).
 *
 * For now, this is a placeholder showing the worker structure.
 */

import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "../activities";

export async function createWorker() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
    // TLS config for Temporal Cloud will be added here
  });

  const worker = await Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE || "default",
    taskQueue: "byte-dashboard",
    workflowsPath: require.resolve("../workflows"),
    activities,
  });

  return worker;
}

export async function runWorker() {
  const worker = await createWorker();
  console.log("Temporal worker started");
  await worker.run();
}

// Only run if this file is executed directly (not imported)
if (require.main === module) {
  runWorker().catch((err) => {
    console.error("Worker failed:", err);
    process.exit(1);
  });
}
