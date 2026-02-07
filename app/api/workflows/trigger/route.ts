import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTemporalClient } from "@/lib/temporal/client";
import { db } from "@/lib/db";
import { workflows, contacts, workflowDefinitions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { ApplicantReviewWorkflowInput } from "@/lib/workflows/applicant-review-workflow";

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

    // Get contact details scoped to org to avoid resource existence leaks
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.orgId, orgId)));

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Validate optional workflow definition ownership
    let definitionVersion = 1;
    if (workflowDefinitionId) {
      const [workflowDefinition] = await db
        .select({
          id: workflowDefinitions.id,
          version: workflowDefinitions.version,
        })
        .from(workflowDefinitions)
        .where(
          and(
            eq(workflowDefinitions.id, workflowDefinitionId),
            eq(workflowDefinitions.orgId, orgId)
          )
        );

      if (!workflowDefinition) {
        return NextResponse.json(
          { error: "Workflow definition not found" },
          { status: 404 }
        );
      }

      definitionVersion = workflowDefinition.version;
    }

    // Create workflow execution record in DB
    const [workflowExecution] = await db
      .insert(workflows)
      .values({
        orgId,
        contactId,
        workflowDefinitionId: workflowDefinitionId || null,
        definitionVersion,
        status: "running",
        source: "manual",
      })
      .returning();

    try {
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
        .where(
          and(
            eq(workflows.id, workflowExecution.id),
            eq(workflows.orgId, orgId)
          )
        );

      // Don't wait for result - workflow runs in background
      return NextResponse.json({
        workflowId: workflowExecution.id,
        temporalWorkflowId: handle.workflowId,
        status: "running",
      });
    } catch (startError) {
      // Compensate so failed starts do not leave orphan "running" executions
      try {
        await db
          .update(workflows)
          .set({
            status: "failed",
            completedAt: new Date(),
            updatedAt: new Date(),
            metadata: {
              triggerError:
                startError instanceof Error ? startError.message : String(startError),
            },
          })
          .where(
            and(
              eq(workflows.id, workflowExecution.id),
              eq(workflows.orgId, orgId)
            )
          );
      } catch (compensationError) {
        console.error("Failed to compensate workflow execution:", compensationError);
      }

      throw startError;
    }
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
