import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTemporalClient } from "@/lib/temporal/client";
import { db } from "@/lib/db";
import { workflows, contacts, workflowDefinitions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { ApplicantReviewWorkflowInput } from "@/lib/workflows/applicant-review-workflow";
import type { GenericWorkflowInput } from "@/lib/workflows/generic-workflow";

/**
 * POST /api/workflows/trigger
 *
 * Starts a new workflow execution.
 *
 * If workflowDefinitionId is provided, starts the genericWorkflow
 * interpreter. Otherwise falls back to the hardcoded
 * applicantReviewWorkflow (legacy).
 *
 * Request body:
 * {
 *   "contactId": "uuid",
 *   "workflowDefinitionId": "uuid" (optional)
 * }
 */
export async function POST(req: Request) {
  try {
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

    // Validate optional workflow definition
    let definitionVersion: number | null = null;
    let definitionName: string | undefined;
    if (workflowDefinitionId) {
      const [workflowDefinition] = await db
        .select({
          id: workflowDefinitions.id,
          name: workflowDefinitions.name,
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

      definitionName = workflowDefinition.name;
      definitionVersion = workflowDefinition.version;
    }

    // Create workflow execution record in DB
    const [workflowExecution] = await db
      .insert(workflows)
      .values({
        orgId,
        contactId,
        workflowDefinitionId: workflowDefinitionId || null,
        definitionVersion: definitionVersion ?? null,
        status: "running",
        source: "manual",
      })
      .returning();

    try {
      const client = await getTemporalClient();

      // Decide which workflow to start
      const useGeneric = Boolean(workflowDefinitionId);
      const contactName =
        `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();

      if (useGeneric) {
        const genericDefinitionId = workflowDefinitionId as string;

        // Start generic workflow interpreter
        const workflowInput: GenericWorkflowInput = {
          workflowId: workflowExecution.id,
          orgId,
          contactId: contact.id,
          contactEmail: contact.email || "",
          contactFirstName: contact.firstName,
          definitionId: genericDefinitionId,
        };

        const temporalWorkflowId = `generic-workflow-${workflowExecution.id}`;
        const handle = await client.workflow.start("genericWorkflow", {
          taskQueue: "byte-dashboard",
          args: [workflowInput],
          workflowId: temporalWorkflowId,
        });

        console.log(`Started generic workflow: ${temporalWorkflowId}`);

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

        return NextResponse.json({
          workflowId: workflowExecution.id,
          temporalWorkflowId: handle.workflowId,
          status: "running",
          workflow: {
            ...workflowExecution,
            temporalWorkflowId: handle.workflowId,
            temporalRunId: handle.firstExecutionRunId,
            contactName,
            contactAvatarUrl: contact.avatarUrl ?? undefined,
            definitionName,
          },
        });
      } else {
        // Legacy: start hardcoded applicant review workflow
        const workflowInput: ApplicantReviewWorkflowInput = {
          workflowId: workflowExecution.id,
          orgId,
          contactId: contact.id,
          contactEmail: contact.email || "",
          contactFirstName: contact.firstName,
        };

        const temporalWorkflowId = `applicant-review-${workflowExecution.id}`;
        const handle = await client.workflow.start(
          "applicantReviewWorkflow",
          {
            taskQueue: "byte-dashboard",
            args: [workflowInput],
            workflowId: temporalWorkflowId,
          }
        );

        console.log(
          `Started applicant review workflow: ${temporalWorkflowId}`
        );

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

        return NextResponse.json({
          workflowId: workflowExecution.id,
          temporalWorkflowId: handle.workflowId,
          status: "running",
          workflow: {
            ...workflowExecution,
            temporalWorkflowId: handle.workflowId,
            temporalRunId: handle.firstExecutionRunId,
            contactName,
            contactAvatarUrl: contact.avatarUrl ?? undefined,
            definitionName,
          },
        });
      }
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
                startError instanceof Error
                  ? startError.message
                  : String(startError),
            },
          })
          .where(
            and(
              eq(workflows.id, workflowExecution.id),
              eq(workflows.orgId, orgId)
            )
          );
      } catch (compensationError) {
        console.error(
          "Failed to compensate workflow execution:",
          compensationError
        );
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
