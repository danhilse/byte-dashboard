import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTemporalClient } from "@/lib/temporal/client";
import { db } from "@/lib/db";
import { workflows, contacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type {
  ApplicantReviewWorkflowInput,
  ApplicantReviewWorkflowResult,
} from "@/lib/workflows/applicant-review-workflow";

/**
 * POST /api/workflows/trigger
 *
 * Starts a new applicant review workflow execution
 *
 * Request body:
 * {
 *   "contactId": "uuid",
 *   "workflowDefinitionId": "uuid" (optional)
 * }
 *
 * Returns:
 * {
 *   "workflowId": "uuid",
 *   "temporalWorkflowId": "string",
 *   "status": "running"
 * }
 */
export async function POST(req: Request) {
  try {
    // Get authenticated user and org
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { contactId, workflowDefinitionId } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: "contactId is required" },
        { status: 400 }
      );
    }

    // Get contact details
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, contactId));

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    if (contact.orgId !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create workflow execution record in DB
    const [workflowExecution] = await db
      .insert(workflows)
      .values({
        orgId,
        contactId,
        workflowDefinitionId: workflowDefinitionId || null,
        definitionVersion: 1,
        status: "running",
        source: "manual",
      })
      .returning();

    // Get Temporal client
    const client = await getTemporalClient();

    // Prepare workflow input
    const workflowInput: ApplicantReviewWorkflowInput = {
      workflowId: workflowExecution.id,
      orgId,
      contactId: contact.id,
      contactEmail: contact.email || "",
      contactFirstName: contact.firstName,
    };

    // Start Temporal workflow
    const temporalWorkflowId = `applicant-review-${workflowExecution.id}`;
    const handle = await client.workflow.start("applicantReviewWorkflow", {
      taskQueue: "byte-dashboard",
      args: [workflowInput],
      workflowId: temporalWorkflowId,
    });

    console.log(`Started applicant review workflow: ${temporalWorkflowId}`);

    // Update workflow execution with Temporal IDs
    await db
      .update(workflows)
      .set({
        temporalWorkflowId: handle.workflowId,
        temporalRunId: handle.firstExecutionRunId,
      })
      .where(eq(workflows.id, workflowExecution.id));

    // Don't wait for result - workflow runs in background
    return NextResponse.json({
      workflowId: workflowExecution.id,
      temporalWorkflowId: handle.workflowId,
      status: "running",
    });
  } catch (error) {
    console.error("Error starting workflow:", error);
    return NextResponse.json(
      {
        error: "Failed to start workflow",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
