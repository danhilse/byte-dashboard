import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { activityLog, users } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

/**
 * GET /api/activity
 *
 * Returns activity feed entries.
 * Query params:
 *   ?entityType=workflow&entityId={uuid} - Entity-specific feed
 *   ?limit=20 - Number of entries (default 20)
 *
 * Without entityType/entityId: returns dashboard-wide feed.
 */
export async function GET(req: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const entityType = url.searchParams.get("entityType");
    const entityId = url.searchParams.get("entityId");
    const limitParam = url.searchParams.get("limit");
    let limit = 20;
    if (limitParam !== null) {
      if (!/^\d+$/.test(limitParam)) {
        return NextResponse.json(
          { error: "limit must be a positive integer" },
          { status: 400 }
        );
      }

      limit = Math.min(Math.max(Number.parseInt(limitParam, 10), 1), 100);
    }

    const conditions = [eq(activityLog.orgId, orgId)];

    if (entityType && entityId) {
      if (!["workflow", "contact", "task"].includes(entityType)) {
        return NextResponse.json(
          { error: "entityType must be workflow, contact, or task" },
          { status: 400 }
        );
      }
      conditions.push(eq(activityLog.entityType, entityType));
      conditions.push(eq(activityLog.entityId, entityId));
    }

    const rows = await db
      .select({
        id: activityLog.id,
        entityType: activityLog.entityType,
        entityId: activityLog.entityId,
        action: activityLog.action,
        details: activityLog.details,
        createdAt: activityLog.createdAt,
        userId: activityLog.userId,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(activityLog)
      .leftJoin(users, eq(activityLog.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);

    const activities = rows.map((row) => ({
      id: row.id,
      entityType: row.entityType as "workflow" | "contact" | "task",
      entityId: row.entityId,
      action: row.action,
      details: row.details as Record<string, unknown>,
      createdAt: row.createdAt.toISOString(),
      userId: row.userId,
      userName:
        [row.userFirstName, row.userLastName].filter(Boolean).join(" ") ||
        "System",
    }));

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch activity",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
