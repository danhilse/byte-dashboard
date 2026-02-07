import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workflows, contacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/workflows/[id]
 *
 * Gets workflow execution details from the database
 *
 * Returns:
 * {
 *   "id": "uuid",
 *   "orgId": "string",
 *   "contactId": "uuid",
 *   "contact": { ... },
 *   "status": "running",
 *   "currentStepId": "step-1",
 *   "currentPhaseId": "phase-1",
 *   "temporalWorkflowId": "string",
 *   "startedAt": "ISO8601",
 *   "completedAt": "ISO8601" | null,
 *   ...
 * }
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get authenticated user and org
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get workflow execution with contact details
    const [workflowExecution] = await db
      .select({
        workflow: workflows,
        contact: contacts,
      })
      .from(workflows)
      .leftJoin(contacts, eq(workflows.contactId, contacts.id))
      .where(eq(workflows.id, id));

    if (!workflowExecution) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    if (workflowExecution.workflow.orgId !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      ...workflowExecution.workflow,
      contact: workflowExecution.contact,
    });
  } catch (error) {
    console.error("Error getting workflow:", error);
    return NextResponse.json(
      {
        error: "Failed to get workflow",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
