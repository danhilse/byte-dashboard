import { NextResponse } from "next/server";
import { getTemporalClient } from "@/lib/temporal/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const namespace = process.env.TEMPORAL_NAMESPACE || "default";

  try {
    const client = await getTemporalClient();

    // Namespace-scoped check: validates both connectivity AND namespace existence.
    // getSystemInfo({}) only proves the server is reachable, not that the
    // configured namespace is valid — describeNamespace catches both.
    const nsResponse =
      await client.connection.workflowService.describeNamespace({
        namespace,
      });

    return NextResponse.json({
      status: "ok",
      namespace,
      namespaceState: nsResponse.namespaceInfo?.state ?? null,
    });
  } catch {
    return NextResponse.json(
      { status: "error", namespace },
      { status: 503 }
    );
  }
}
