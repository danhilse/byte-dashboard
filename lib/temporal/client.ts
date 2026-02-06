import { Connection, Client } from "@temporalio/client";

/**
 * Temporal Client Configuration
 *
 * For local development: Connect to localhost
 * For production: Connect to Temporal Cloud
 *
 * Environment Variables:
 * - TEMPORAL_ADDRESS: Temporal server address (e.g., namespace.account.tmprl.cloud:7233)
 * - TEMPORAL_NAMESPACE: Temporal namespace (default: 'default')
 * - TEMPORAL_CLIENT_CERT: Client certificate (base64 encoded for Temporal Cloud)
 * - TEMPORAL_CLIENT_KEY: Client private key (base64 encoded for Temporal Cloud)
 */

let client: Client | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (client) {
    return client;
  }

  const address = process.env.TEMPORAL_ADDRESS || "localhost:7233";
  const namespace = process.env.TEMPORAL_NAMESPACE || "default";

  // Check if we're connecting to Temporal Cloud (requires TLS)
  const isCloud = address.includes("tmprl.cloud");

  let connection: Connection;

  if (isCloud) {
    // Temporal Cloud connection with mTLS
    const clientCert = process.env.TEMPORAL_CLIENT_CERT;
    const clientKey = process.env.TEMPORAL_CLIENT_KEY;

    if (!clientCert || !clientKey) {
      throw new Error(
        "TEMPORAL_CLIENT_CERT and TEMPORAL_CLIENT_KEY are required for Temporal Cloud"
      );
    }

    // Decode base64-encoded certificates
    const cert = Buffer.from(clientCert, "base64");
    const key = Buffer.from(clientKey, "base64");

    connection = await Connection.connect({
      address,
      tls: {
        clientCertPair: {
          crt: cert,
          key: key,
        },
      },
    });
  } else {
    // Local development connection (no TLS)
    connection = await Connection.connect({
      address,
    });
  }

  client = new Client({
    connection,
    namespace,
  });

  console.log(`Connected to Temporal at ${address} (namespace: ${namespace})`);

  return client;
}

/**
 * Close the Temporal client connection
 */
export async function closeTemporalClient(): Promise<void> {
  if (client) {
    await client.connection.close();
    client = null;
  }
}
