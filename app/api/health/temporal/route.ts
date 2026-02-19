import { NextResponse } from "next/server";
import { checkTemporalHealth } from "@/lib/health/checks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
