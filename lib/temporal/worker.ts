/**
 * Temporal Worker Configuration
 *
 * Workers execute workflow and activity code. In production, workers run on Railway,
 * separate from the Next.js app on Vercel (which only starts workflows via API routes).
 *
 * Supports three connection modes:
 * 1. Local development (localhost, no auth)
 * 2. Temporal Cloud with mTLS (*.tmprl.cloud with client cert/key)
 * 3. Temporal Cloud with API key (*.aws.api.temporal.io with API key)
 *
 * Environment Variables:
 * - TEMPORAL_ADDRESS: Temporal server address
 * - TEMPORAL_NAMESPACE: Temporal namespace
 * - TEMPORAL_TASK_QUEUE: Temporal task queue name (default: byte-dashboard)
 * - TEMPORAL_API_KEY: API key for Temporal Cloud (AWS endpoints)
 * - TEMPORAL_CLIENT_CERT: Client certificate for mTLS (base64 encoded)
 * - TEMPORAL_CLIENT_KEY: Client private key for mTLS (base64 encoded)
 */

import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "../activities";
import * as path from "path";
import { getTemporalTaskQueue } from "./task-queue";

export async function createWorker() {
  const address = process.env.TEMPORAL_ADDRESS || "localhost:7233";
  const namespace = process.env.TEMPORAL_NAMESPACE || "default";
  const taskQueue = getTemporalTaskQueue();

  // Determine connection type based on address and available credentials
  const isTmprlCloud = address.includes("tmprl.cloud");
  const isAwsApiEndpoint = address.includes("aws.api.temporal.io");
  const hasApiKey = !!process.env.TEMPORAL_API_KEY;
  const hasMtlsCreds = !!(
    process.env.TEMPORAL_CLIENT_CERT && process.env.TEMPORAL_CLIENT_KEY
  );

  let connection: NativeConnection;

  if (isTmprlCloud && hasMtlsCreds) {
    // Temporal Cloud with mTLS (*.tmprl.cloud)
    console.log("Worker connecting to Temporal Cloud with mTLS...");

    const clientCert = process.env.TEMPORAL_CLIENT_CERT!;
    const clientKey = process.env.TEMPORAL_CLIENT_KEY!;

    // Decode base64-encoded certificates
    const cert = Buffer.from(clientCert, "base64");
    const key = Buffer.from(clientKey, "base64");

    connection = await NativeConnection.connect({
      address,
      tls: {
        clientCertPair: {
          crt: cert,
          key: key,
        },
      },
    });
  } else if (isAwsApiEndpoint && hasApiKey) {
    // Temporal Cloud with API key (*.aws.api.temporal.io)
    console.log("Worker connecting to Temporal Cloud with API key...");

    connection = await NativeConnection.connect({
      address,
      tls: true, // Enable TLS
      metadata: {
        authorization: `Bearer ${process.env.TEMPORAL_API_KEY}`,
      },
    });
  } else if (address === "localhost:7233" || address.startsWith("127.0.0.1")) {
    // Local development (no auth)
    console.log("Worker connecting to local Temporal server...");

    connection = await NativeConnection.connect({
      address,
    });
  } else {
    // Unknown configuration
    throw new Error(
      `Unable to determine Temporal connection method for address: ${address}. ` +
        `Please ensure you have either:\n` +
        `  - TEMPORAL_API_KEY for AWS API endpoints (*.aws.api.temporal.io)\n` +
        `  - TEMPORAL_CLIENT_CERT and TEMPORAL_CLIENT_KEY for Temporal Cloud (*.tmprl.cloud)\n` +
        `  - Or use localhost:7233 for local development`
    );
  }

  console.log(
    `Worker connected to Temporal at ${address} (namespace: ${namespace}, taskQueue: ${taskQueue})`
  );

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue,
    workflowsPath: path.join(__dirname, "../workflows"),
    activities,
  });

  return worker;
}

export async function runWorker() {
  const worker = await createWorker();
  console.log("✅ Temporal worker started and polling for tasks...");
  await worker.run();
}

// Only run if this file is executed directly (not imported)
if (require.main === module) {
  runWorker().catch((err) => {
    console.error("❌ Worker failed:", err);
    process.exit(1);
  });
}
