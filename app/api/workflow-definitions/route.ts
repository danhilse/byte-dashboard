import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workflowDefinitions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * GET /api/workflow-definitions
 *
 * Lists active workflow definitions for the authenticated organization.
 * Used by the create workflow dialog's definition picker.
 */
export async function GET() {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const definitions = await db
      .select({
        id: workflowDefinitions.id,
        name: workflowDefinitions.name,
        description: workflowDefinitions.description,
        version: workflowDefinitions.version,
      })
      .from(workflowDefinitions)
      .where(
        and(
          eq(workflowDefinitions.orgId, orgId),
          eq(workflowDefinitions.isActive, true)
        )
      );

    return NextResponse.json({ definitions });
  } catch (error) {
    console.error("Error fetching workflow definitions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch workflow definitions",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
