import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

/**
 * PATCH /api/tasks/[id]/claim
 *
 * Atomically claims an unclaimed task for the authenticated user.
 * Uses a WHERE assignedTo IS NULL guard to prevent race conditions.
 *
 * Returns:
 *   200 - { task } on success
 *   404 - task not found
 *   409 - task already claimed by another user
 */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Atomic claim: only succeeds if assignedTo is still NULL
    const [claimed] = await db
      .update(tasks)
      .set({ assignedTo: userId, updatedAt: new Date() })
      .where(
        and(
          eq(tasks.id, id),
          eq(tasks.orgId, orgId),
          isNull(tasks.assignedTo)
        )
      )
      .returning();

    if (!claimed) {
      // Differentiate between 404 (not found) and 409 (already claimed)
      const [existing] = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)));

      if (!existing) {
        return NextResponse.json(
          { error: "Task not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: "Task already claimed by another user" },
        { status: 409 }
      );
    }

    return NextResponse.json({ task: claimed });
  } catch (error) {
    console.error("Error claiming task:", error);
    return NextResponse.json(
      {
        error: "Failed to claim task",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
