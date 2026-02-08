/**
 * Activity Logging Helper
 *
 * Provides a single function to log activity entries across all entity types.
 * Maps entityType to the correct soft FK column to satisfy the CHECK constraint.
 */

import { db } from "@/lib/db";
import { activityLog } from "@/lib/db/schema";

interface LogActivityParams {
  orgId: string;
  userId: string | null; // null for system-generated (Temporal) activities
  entityType: "workflow" | "contact" | "task";
  entityId: string;
  action: string; // 'created', 'updated', 'deleted', 'status_changed', 'note_added'
  details?: Record<string, unknown>;
}

/**
 * Logs an activity entry in the activity_log table.
 *
 * Maps entityType to the correct soft FK column:
 * - 'workflow' → workflowId
 * - 'contact' → contactId
 * - 'task' → taskId
 *
 * Wrapped in try/catch so logging failures never break mutations.
 */
export async function logActivity({
  orgId,
  userId,
  entityType,
  entityId,
  action,
  details = {},
}: LogActivityParams): Promise<void> {
  try {
    const softFks: {
      workflowId?: string;
      contactId?: string;
      taskId?: string;
    } = {};

    switch (entityType) {
      case "workflow":
        softFks.workflowId = entityId;
        break;
      case "contact":
        softFks.contactId = entityId;
        break;
      case "task":
        softFks.taskId = entityId;
        break;
    }

    await db.insert(activityLog).values({
      orgId,
      userId,
      entityType,
      entityId,
      action,
      details,
      ...softFks,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Never throw — logging failures must not break mutations
  }
}
