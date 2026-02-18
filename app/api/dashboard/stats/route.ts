import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/api-guard";
import {
  getDashboardStats,
  getWorkflowCountsByStatus,
  getRecentWorkflows,
  getMyTasks,
  getRecentActivity,
} from "@/lib/db/queries";

/**
 * GET /api/dashboard/stats
 *
 * Returns dashboard stats, workflow status breakdown,
 * recent workflows, user's tasks, and recent activity.
 * Single endpoint to minimize round trips.
 */
export async function GET() {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "dashboard.read",
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { userId, orgId } = authResult.context;

    const [stats, workflowsByStatus, recentWorkflows, myTasks, recentActivity] =
      await Promise.all([
        getDashboardStats(orgId),
        getWorkflowCountsByStatus(orgId),
        getRecentWorkflows(orgId, 5),
        getMyTasks(orgId, userId, 5),
        getRecentActivity(orgId, 10),
      ]);

    return NextResponse.json({
      stats,
      workflowsByStatus,
      recentWorkflows,
      myTasks,
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard stats",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
