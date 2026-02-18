import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * DELETE /api/notes/[id]
 *
 * Deletes a note. Only the note author can delete it.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "notes.write",
    });
    const { id } = await params;

    if (!authResult.ok) {
      return authResult.response;
    }
    const { userId, orgId } = authResult.context;

    // Only allow deletion by the note author within the same org
    const [deletedNote] = await db
      .delete(notes)
      .where(
        and(eq(notes.id, id), eq(notes.orgId, orgId), eq(notes.userId, userId))
      )
      .returning();

    if (!deletedNote) {
      // Check if note exists but belongs to another user
      const [existing] = await db
        .select({ id: notes.id })
        .from(notes)
        .where(and(eq(notes.id, id), eq(notes.orgId, orgId)));

      if (existing) {
        return NextResponse.json(
          { error: "You can only delete your own notes" },
          { status: 403 }
        );
      }

      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      {
        error: "Failed to delete note",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
