import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { validateServerEnvironment } from "@/lib/env/server-env";
import { getTemporalClient } from "@/lib/temporal/client";

export type HealthCheckStatus = "ok" | "error";

interface BaseHealthCheck {
  status: HealthCheckStatus;
  latencyMs: number;
}

export interface AppHealthCheck extends BaseHealthCheck {
  runtime: "nodejs";
  nodeEnv: string;
  error?: string;
}

export interface DatabaseHealthCheck extends BaseHealthCheck {
  error?: string;
}

export interface TemporalHealthCheck extends BaseHealthCheck {
  namespace: string;
  address: string;
  namespaceState?: number | null;
  error?: string;
}

function getLatencyMs(startedAt: number): number {
  return Date.now() - startedAt;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unknown error";
}

export function checkAppHealth(): AppHealthCheck {
  const startedAt = Date.now();

  try {
    validateServerEnvironment();

    return {
      status: "ok",
      latencyMs: getLatencyMs(startedAt),
      runtime: "nodejs",
      nodeEnv: process.env.NODE_ENV || "development",
    };
  } catch (error) {
    return {
      status: "error",
      latencyMs: getLatencyMs(startedAt),
      runtime: "nodejs",
      nodeEnv: process.env.NODE_ENV || "development",
      error: getErrorMessage(error),
    };
  }
}

export async function checkDatabaseHealth(): Promise<DatabaseHealthCheck> {
  const startedAt = Date.now();

  try {
    await db.execute(sql`select 1`);

    return {
      status: "ok",
      latencyMs: getLatencyMs(startedAt),
    };
  } catch (error) {
    return {
      status: "error",
      latencyMs: getLatencyMs(startedAt),
      error: getErrorMessage(error),
    };
  }
}

export async function checkTemporalHealth(): Promise<TemporalHealthCheck> {
  const startedAt = Date.now();
  const namespace = process.env.TEMPORAL_NAMESPACE || "default";
  const address = process.env.TEMPORAL_ADDRESS || "localhost:7233";

  try {
    const client = await getTemporalClient();
    const nsResponse =
      await client.connection.workflowService.describeNamespace({
        namespace,
      });

    return {
      status: "ok",
      latencyMs: getLatencyMs(startedAt),
      namespace,
      address,
      namespaceState: nsResponse.namespaceInfo?.state ?? null,
    };
  } catch (error) {
    return {
      status: "error",
      latencyMs: getLatencyMs(startedAt),
      namespace,
      address,
      error: getErrorMessage(error),
    };
  }
}
