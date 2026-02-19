import { NextResponse } from "next/server";
import { checkTemporalHealth } from "@/lib/health/checks";
import { withApiRequestLogging } from "@/lib/logging/api-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function GETHandler() {
  const temporal = await checkTemporalHealth();

  if (temporal.status === "ok") {
    return NextResponse.json({
      status: temporal.status,
      namespace: temporal.namespace,
      namespaceState: temporal.namespaceState ?? null,
    });
  }

  return NextResponse.json(
    { status: temporal.status, namespace: temporal.namespace },
    { status: 503 }
  );
}

export const GET = withApiRequestLogging(GETHandler);
