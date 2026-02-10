import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { markNotificationRead } from "@/lib/notifications/service";

/**
 * PATCH /api/notifications/[id]
 *
 * Marks an individual notification as read/dismissed.
 */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
