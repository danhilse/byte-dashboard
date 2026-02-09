import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTemporalClient } from "@/lib/temporal/client";
import { db } from "@/lib/db";
import { workflowExecutions, contacts, workflowDefinitions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { logActivity } from "@/lib/db/log-activity";
import type { GenericWorkflowInput } from "@/lib/workflows/generic-workflow";
import { resolveInitialWorkflowStatus } from "@/lib/workflow-status";
import type { DefinitionStatus } from "@/types";

/**
 * POST /api/workflows/trigger
 *
 * Starts a new workflow execution.
 *
 * Starts the generic workflow interpreter for a workflow definition.
 *
 * Request body:
 * {
 *   "contactId": "uuid",
 *   "workflowDefinitionId": "uuid" (required)
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

    if (!contactId || typeof contactId !== "string") {
      return NextResponse.json(
        { error: "contactId is required" },
        { status: 400 }
      );
    }
    if (!workflowDefinitionId || typeof workflowDefinitionId !== "string") {
      return NextResponse.json(
        { error: "workflowDefinitionId is required" },
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

    // Validate workflow definition
    const [workflowDefinition] = await db
      .select({
        id: workflowDefinitions.id,
        name: workflowDefinitions.name,
        version: workflowDefinitions.version,
        statuses: workflowDefinitions.statuses,
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

    const definitionName = workflowDefinition.name;
    const definitionVersion = workflowDefinition.version;
    const definitionStatuses =
      (workflowDefinition.statuses as DefinitionStatus[] | null) ?? [];

    const initialStatus = resolveInitialWorkflowStatus(
      definitionStatuses,
      "running"
    );

    // Create workflow execution record in DB
    const [workflowExecution] = await db
      .insert(workflowExecutions)
      .values({
        orgId,
        contactId,
        workflowDefinitionId,
        definitionVersion,
        status: initialStatus,
        source: "manual",
      })
      .returning();

    const contactName = `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();

    await logActivity({
      orgId,
      userId,
      entityType: "workflow",
      entityId: workflowExecution.id,
      action: "created",
      details: { contactName, definitionName, source: "trigger_api" },
    });

    try {
      const client = await getTemporalClient();

      const workflowInput: GenericWorkflowInput = {
        workflowExecutionId: workflowExecution.id,
        orgId,
        contactId: contact.id,
        contactEmail: contact.email || "",
        contactFirstName: contact.firstName,
        contactLastName: contact.lastName || "",
        contactPhone: contact.phone || "",
        definitionId: workflowDefinitionId,
      };

      const temporalWorkflowId = `generic-workflow-${workflowExecution.id}`;
      const handle = await client.workflow.start("genericWorkflow", {
        taskQueue: "byte-dashboard",
        args: [workflowInput],
        workflowId: temporalWorkflowId,
      });

      console.log(`Started generic workflow: ${temporalWorkflowId}`);

      await db
        .update(workflowExecutions)
        .set({
          temporalWorkflowId: handle.workflowId,
          temporalRunId: handle.firstExecutionRunId,
        })
        .where(
          and(
            eq(workflowExecutions.id, workflowExecution.id),
            eq(workflowExecutions.orgId, orgId)
          )
        );

      return NextResponse.json({
        workflowExecutionId: workflowExecution.id,
        temporalWorkflowId: handle.workflowId,
        status: initialStatus,
        workflow: {
          ...workflowExecution,
          temporalWorkflowId: handle.workflowId,
          temporalRunId: handle.firstExecutionRunId,
          contactName,
          contactAvatarUrl: contact.avatarUrl ?? undefined,
          definitionName,
          definitionStatuses,
        },
      });
    } catch (startError) {
      // Compensate so failed starts do not leave orphan "running" executions
      try {
        const failedStatus =
          definitionStatuses?.some((status) => status.id === "failed")
            ? "failed"
            : initialStatus;

        await db
          .update(workflowExecutions)
          .set({
            status: failedStatus,
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
              eq(workflowExecutions.id, workflowExecution.id),
              eq(workflowExecutions.orgId, orgId)
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
