import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/api-guard";
import { getTemporalClient } from "@/lib/temporal/client";
import { db } from "@/lib/db";
import { workflowExecutions, contacts, workflowDefinitions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { logActivity } from "@/lib/db/log-activity";
import type { GenericWorkflowInput } from "@/lib/workflows/generic-workflow";
import type { DefinitionStatus } from "@/types";
import { getTemporalTaskQueue } from "@/lib/temporal/task-queue";
import {
  fromDefinitionToAuthoring,
  type DefinitionRecordLike,
} from "@/lib/workflow-builder-v2/adapters/definition-runtime-adapter";

/**
 * POST /api/workflows/trigger
 *
 * Starts a new workflow execution.
 *
 * Starts the generic workflow interpreter for a workflow definition.
 *
 * Request body:
 * {
 *   "contactId": "uuid" (required),
 *   "workflowDefinitionId": "uuid" (required),
 *   "initialStatus": "string" (optional) - Sets the initial workflow status
 * }
 */
export async function POST(req: Request) {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "workflows.trigger",
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { userId, orgId } = authResult.context;

    const body = await req.json();
    const { contactId, workflowDefinitionId, initialStatus } = body;

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
    if (initialStatus !== undefined && typeof initialStatus !== "string") {
      return NextResponse.json(
        { error: "initialStatus must be a string if provided" },
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
        description: workflowDefinitions.description,
        version: workflowDefinitions.version,
        steps: workflowDefinitions.steps,
        phases: workflowDefinitions.phases,
        variables: workflowDefinitions.variables,
        statuses: workflowDefinitions.statuses,
        createdAt: workflowDefinitions.createdAt,
        updatedAt: workflowDefinitions.updatedAt,
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

    const definitionRecordLike: DefinitionRecordLike = {
      id: workflowDefinition.id,
      name: workflowDefinition.name,
      description: workflowDefinition.description,
      statuses: workflowDefinition.statuses,
      phases: workflowDefinition.phases,
      variables: workflowDefinition.variables,
      steps: workflowDefinition.steps,
      createdAt: workflowDefinition.createdAt.toISOString(),
      updatedAt: workflowDefinition.updatedAt.toISOString(),
    };

    const triggerInitialStatus =
      fromDefinitionToAuthoring(definitionRecordLike).trigger.initialStatus;

    // Explicit request status wins. Otherwise use trigger-config default. Fallback: unset.
    const workflowInitialStatus = initialStatus ?? triggerInitialStatus ?? "";

    // Create workflow execution record in DB
    const [workflowExecution] = await db
      .insert(workflowExecutions)
      .values({
        orgId,
        contactId,
        workflowDefinitionId,
        definitionVersion,
        status: workflowInitialStatus,
        workflowExecutionState: "running",
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
        initialStatus: workflowInitialStatus,
      };

      const temporalWorkflowId = `generic-workflow-${workflowExecution.id}`;
      const taskQueue = getTemporalTaskQueue();
      const handle = await client.workflow.start("genericWorkflow", {
        taskQueue,
        args: [workflowInput],
        workflowId: temporalWorkflowId,
      });

      console.log(
        `Started generic workflow: ${temporalWorkflowId} (taskQueue: ${taskQueue})`
      );

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
        status: workflowInitialStatus,
        workflowExecutionState: "running",
        workflow: {
          ...workflowExecution,
          workflowExecutionState:
            workflowExecution.workflowExecutionState ?? "running",
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
            : workflowInitialStatus;

        await db
          .update(workflowExecutions)
          .set({
            status: failedStatus,
            workflowExecutionState: "error",
            errorDefinition:
              startError instanceof Error
                ? startError.message
                : String(startError),
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
