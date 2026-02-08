import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { notes, users } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { logActivity } from "@/lib/db/log-activity";

/**
 * GET /api/notes?entityType=workflow&entityId={uuid}
 *
 * Lists notes for a specific entity.
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

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      );
    }

    if (!["workflow", "contact", "task"].includes(entityType)) {
      return NextResponse.json(
        { error: "entityType must be workflow, contact, or task" },
        { status: 400 }
      );
    }

    const rows = await db
      .select({
        id: notes.id,
        entityType: notes.entityType,
        entityId: notes.entityId,
        content: notes.content,
        createdAt: notes.createdAt,
        userId: notes.userId,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(notes)
      .leftJoin(users, eq(notes.userId, users.id))
      .where(
        and(
          eq(notes.orgId, orgId),
          eq(notes.entityType, entityType),
          eq(notes.entityId, entityId)
        )
      )
      .orderBy(desc(notes.createdAt));

    const result = rows.map((row) => ({
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      userId: row.userId,
      userName:
        [row.userFirstName, row.userLastName].filter(Boolean).join(" ") ||
        "Unknown",
    }));

    return NextResponse.json({ notes: result });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch notes",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes
 *
 * Creates a new note for an entity.
 * Body: { entityType, entityId, content }
 */
export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { entityType, entityId, content } = body;

    if (!entityType || !entityId || !content) {
      return NextResponse.json(
        { error: "entityType, entityId, and content are required" },
        { status: 400 }
      );
    }

    if (!["workflow", "contact", "task"].includes(entityType)) {
      return NextResponse.json(
        { error: "entityType must be workflow, contact, or task" },
        { status: 400 }
      );
    }

    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "content must be a non-empty string" },
        { status: 400 }
      );
    }

    // Set the correct soft FK based on entityType
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

    const [note] = await db
      .insert(notes)
      .values({
        orgId,
        entityType,
        entityId,
        userId,
        content: content.trim(),
        ...softFks,
      })
      .returning();

    // Log activity for note creation
    await logActivity({
      orgId,
      userId,
      entityType: entityType as "workflow" | "contact" | "task",
      entityId,
      action: "note_added",
    });

    // Get the user's name for the response
    const [user] = await db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, userId));

    const userName = user
      ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown"
      : "Unknown";

    return NextResponse.json({
      note: {
        id: note.id,
        entityType: note.entityType,
        entityId: note.entityId,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        userId: note.userId,
        userName,
      },
    });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      {
        error: "Failed to create note",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
