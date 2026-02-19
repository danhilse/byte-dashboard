/**
 * Temporal Connectivity Check
 *
 * Verifies that the app can reach Temporal using the current environment variables.
 * Usage: npm run temporal:check
 */

import { Connection } from "@temporalio/client";

async function main() {
  const address = process.env.TEMPORAL_ADDRESS || "localhost:7233";
  const namespace = process.env.TEMPORAL_NAMESPACE || "default";

  // Determine connection mode
  const isTmprlCloud = address.includes("tmprl.cloud");
  const isAwsApiEndpoint = address.includes("aws.api.temporal.io");
  const hasApiKey = !!process.env.TEMPORAL_API_KEY;
  const hasMtlsCreds = !!(
    process.env.TEMPORAL_CLIENT_CERT && process.env.TEMPORAL_CLIENT_KEY
  );

  let mode: string;
  if (isTmprlCloud && hasMtlsCreds) {
    mode = "mTLS (*.tmprl.cloud)";
  } else if (isAwsApiEndpoint && hasApiKey) {
    mode = "API key (*.aws.api.temporal.io)";
  } else if (address === "localhost:7233" || address.startsWith("127.0.0.1")) {
    mode = "local (no auth)";
  } else {
    mode = "unknown";
  }

  console.log("--- Temporal Connectivity Check ---");
  console.log(`Address:   ${address}`);
  console.log(`Namespace: ${namespace}`);
  console.log(`Mode:      ${mode}`);
  console.log();

  try {
    let connection: Connection;

    if (isTmprlCloud && hasMtlsCreds) {
      const cert = Buffer.from(process.env.TEMPORAL_CLIENT_CERT!, "base64");
      const key = Buffer.from(process.env.TEMPORAL_CLIENT_KEY!, "base64");
      connection = await Connection.connect({
        address,
        tls: { clientCertPair: { crt: cert, key: key } },
      });
    } else if (isAwsApiEndpoint && hasApiKey) {
      connection = await Connection.connect({
        address,
        tls: true,
        metadata: {
          authorization: `Bearer ${process.env.TEMPORAL_API_KEY}`,
        },
      });
    } else {
      connection = await Connection.connect({ address });
    }

    // Namespace-scoped check: validates both connectivity AND namespace existence.
    // getSystemInfo only proves server reachability, not that the namespace is valid.
    const nsResponse = await connection.workflowService.describeNamespace({
      namespace,
    });

    // Protobuf enum: 0=Unspecified, 1=Registered, 2=Deprecated, 3=Deleted
    const NAMESPACE_STATES: Record<number, string> = {
      0: "Unspecified",
      1: "Registered",
      2: "Deprecated",
      3: "Deleted",
    };
    const stateValue = nsResponse.namespaceInfo?.state;
    const stateLabel =
      typeof stateValue === "number"
        ? NAMESPACE_STATES[stateValue] ?? `Unknown (${stateValue})`
        : String(stateValue ?? "(not reported)");

    console.log("Connected successfully!");
    console.log(`Namespace state: ${stateLabel}`);

    await connection.close();
    console.log("\nResult: OK");
  } catch (error) {
    console.error(
      "Connection failed:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();
