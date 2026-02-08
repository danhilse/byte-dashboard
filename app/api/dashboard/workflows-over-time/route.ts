import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkflowsOverTime } from "@/lib/db/queries";

/**
 * GET /api/dashboard/workflows-over-time?days=30
 *
 * Returns time series data for workflow creation counts per day.
 * Separated from main stats endpoint because it's a heavier query.
 */
export async function GET(req: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
