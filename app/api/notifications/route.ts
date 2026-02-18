import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/api-guard";

import {
  getNotificationsForUser,
  markAllNotificationsRead,
} from "@/lib/notifications/service";

/**
 * GET /api/notifications
 *
 * Returns notifications for the authenticated user.
 */
export async function GET(req: Request) {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "notifications.read",
    });
    if (!authResult.ok) {
      return authResult.response;
    }
    const { userId, orgId } = authResult.context;

    const url = new URL(req.url);
    const limitParam = Number(url.searchParams.get("limit") ?? "");
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 20;

    const payload = await getNotificationsForUser({ orgId, userId, limit });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch notifications",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 *
 * Marks all unread notifications as read for the authenticated user.
 */
export async function PATCH() {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "notifications.write",
    });
    if (!authResult.ok) {
      return authResult.response;
    }
    const { userId, orgId } = authResult.context;

    const markedReadCount = await markAllNotificationsRead({ orgId, userId });
    return NextResponse.json({
      success: true,
      markedReadCount,
      unreadCount: 0,
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      {
        error: "Failed to update notifications",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
