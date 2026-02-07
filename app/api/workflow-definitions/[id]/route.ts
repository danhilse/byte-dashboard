import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workflowDefinitions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/workflow-definitions/:id
 *
 * Gets a single workflow definition by ID (org-scoped).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [definition] = await db
      .select()
      .from(workflowDefinitions)
      .where(
        and(
          eq(workflowDefinitions.id, id),
          eq(workflowDefinitions.orgId, orgId)
        )
      );

    if (!definition) {
      return NextResponse.json(
        { error: "Workflow definition not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ definition });
  } catch (error) {
    console.error("Error fetching workflow definition:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch workflow definition",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workflow-definitions/:id
 *
 * Immutable versioning: clones the definition with a new UUID,
 * increments the version, applies updates, and deactivates the old row.
 * Running executions keep referencing the old version's UUID.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch existing definition
    const [existing] = await db
      .select()
      .from(workflowDefinitions)
      .where(
        and(
          eq(workflowDefinitions.id, id),
          eq(workflowDefinitions.orgId, orgId),
          eq(workflowDefinitions.isActive, true)
        )
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Workflow definition not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, description, steps, phases, variables, statuses } = body;

    // Clone with new UUID, increment version, apply updates
    const [newDefinition] = await db
      .insert(workflowDefinitions)
      .values({
        orgId,
        name: name !== undefined ? name : existing.name,
        description:
          description !== undefined ? description : existing.description,
        version: existing.version + 1,
        steps: steps !== undefined ? steps : existing.steps,
        phases: phases !== undefined ? phases : existing.phases,
        variables: variables !== undefined ? variables : existing.variables,
        statuses: statuses !== undefined ? statuses : existing.statuses,
        isActive: true,
      })
      .returning();

    // Deactivate old version
    await db
      .update(workflowDefinitions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(workflowDefinitions.id, id));

    return NextResponse.json({ definition: newDefinition });
  } catch (error) {
    console.error("Error updating workflow definition:", error);
    return NextResponse.json(
      {
        error: "Failed to update workflow definition",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflow-definitions/:id
 *
 * Soft delete: sets isActive=false.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [definition] = await db
      .update(workflowDefinitions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(workflowDefinitions.id, id),
          eq(workflowDefinitions.orgId, orgId)
        )
      )
      .returning();

    if (!definition) {
      return NextResponse.json(
        { error: "Workflow definition not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, definition });
  } catch (error) {
    console.error("Error deleting workflow definition:", error);
    return NextResponse.json(
      {
        error: "Failed to delete workflow definition",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
