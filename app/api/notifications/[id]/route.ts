import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/api-guard";
import { withApiRequestLogging } from "@/lib/logging/api-route";

import { markNotificationRead } from "@/lib/notifications/service";

/**
 * PATCH /api/notifications/[id]
 *
 * Marks an individual notification as read/dismissed.
 */
async function PATCHHandler(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "notifications.write",
    });
    const { id } = await params;

    if (!authResult.ok) {
      return authResult.response;
    }
    const { userId, orgId } = authResult.context;

    const found = await markNotificationRead({
      orgId,
      userId,
      notificationId: id,
    });

    if (!found) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, notificationId: id });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      {
        error: "Failed to update notification",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export const PATCH = withApiRequestLogging(PATCHHandler);
