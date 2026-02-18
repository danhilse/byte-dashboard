import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/api-guard";
import { getWorkflowsOverTime } from "@/lib/db/queries";

/**
 * GET /api/dashboard/workflows-over-time?days=30
 *
 * Returns time series data for workflow creation counts per day.
 * Separated from main stats endpoint because it's a heavier query.
 */
export async function GET(req: Request) {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "dashboard.read",
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { orgId } = authResult.context;

    const url = new URL(req.url);
    const daysParam = url.searchParams.get("days");
    let days = 30;
    if (daysParam !== null) {
      if (!/^\d+$/.test(daysParam)) {
        return NextResponse.json(
          { error: "days must be a positive integer" },
          { status: 400 }
        );
      }
      days = Math.min(Math.max(Number.parseInt(daysParam, 10), 1), 90);
    }

    const data = await getWorkflowsOverTime(orgId, days);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching workflows over time:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch workflows over time",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
