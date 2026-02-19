import { NextResponse } from "next/server";

import {
  checkAppHealth,
  checkDatabaseHealth,
  checkTemporalHealth,
} from "@/lib/health/checks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const app = checkAppHealth();
  const [db, temporal] = await Promise.all([
    checkDatabaseHealth(),
    checkTemporalHealth(),
  ]);

  const status =
    app.status === "ok" && db.status === "ok" && temporal.status === "ok"
      ? "ok"
      : "error";

  const response = {
    status,
    timestamp: new Date().toISOString(),
    checks: {
      app,
      db,
      temporal,
    },
  };

  return NextResponse.json(response, {
    status: status === "ok" ? 200 : 503,
  });
}
