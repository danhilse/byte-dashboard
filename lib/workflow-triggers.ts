import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflowDefinitions, workflowExecutions } from "@/lib/db/schema";
import { getTemporalClient } from "@/lib/temporal/client";
import { getTemporalTaskQueue } from "@/lib/temporal/task-queue";
import { logActivity } from "@/lib/db/log-activity";
import {
  fromDefinitionToAuthoring,
  type DefinitionRecordLike,
} from "@/lib/workflow-builder-v2/adapters/definition-runtime-adapter";
import type { DefinitionStatus } from "@/types";
import type { GenericWorkflowInput } from "@/lib/workflows/generic-workflow";

interface TriggerableContact {
  id: string;
  orgId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl?: string | null;
}

interface TriggerWorkflowParams {
  orgId: string;
  userId: string | null;
  contact: TriggerableContact;
}

interface TriggerWorkflowUpdateParams extends TriggerWorkflowParams {
  changedFields: Iterable<string>;
}

interface TriggeredWorkflowSummary {
  workflowExecutionId: string;
  workflowDefinitionId: string;
  temporalWorkflowId?: string;
}

interface TriggerFailure {
  workflowDefinitionId: string;
  error: string;
}

interface TriggerResult {
  started: TriggeredWorkflowSummary[];
  failed: TriggerFailure[];
}

interface DefinitionWithAuthoringTrigger {
  id: string;
  name: string;
  description: string | null;
  version: number;
  steps: unknown;
  phases: unknown;
  variables: unknown;
  statuses: unknown;
  createdAt: Date;
  updatedAt: Date;
  trigger: ReturnType<typeof fromDefinitionToAuthoring>["trigger"];
}

function toDefinitionRecordLike(
  definition: Omit<DefinitionWithAuthoringTrigger, "trigger">
): DefinitionRecordLike {
  return {
    ...definition,
    createdAt: definition.createdAt.toISOString(),
    updatedAt: definition.updatedAt.toISOString(),
  };
}

function stringifyError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function loadActiveDefinitionsWithTriggers(
  orgId: string
): Promise<DefinitionWithAuthoringTrigger[]> {
  const definitions = await db
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
        eq(workflowDefinitions.orgId, orgId),
        eq(workflowDefinitions.isActive, true)
      )
    );

  return definitions.map((definition) => {
    const trigger = fromDefinitionToAuthoring(
      toDefinitionRecordLike(definition)
    ).trigger;

    return {
      ...definition,
      trigger,
    };
  });
}

function shouldTriggerForFieldChange(
  watchedFields: string[],
  changedFields: Set<string>
): boolean {
  if (changedFields.size === 0) {
    return false;
  }

  if (watchedFields.length === 0) {
    return true;
  }

  return watchedFields.some((field) => changedFields.has(field));
}

async function startWorkflowExecutionForDefinition({
  orgId,
  userId,
  contact,
  definition,
  triggerType,
}: {
  orgId: string;
  userId: string | null;
  contact: TriggerableContact;
  definition: DefinitionWithAuthoringTrigger;
  triggerType: "contact_created" | "contact_field_changed";
}): Promise<TriggeredWorkflowSummary> {
  const definitionStatuses =
    (definition.statuses as DefinitionStatus[] | null) ?? [];

  const initialStatus = definition.trigger.initialStatus ?? "";

  const [workflowExecution] = await db
    .insert(workflowExecutions)
    .values({
      orgId,
      contactId: contact.id,
      workflowDefinitionId: definition.id,
      definitionVersion: definition.version,
      status: initialStatus,
      workflowExecutionState: "running",
      source: "api",
    })
    .returning();

  const contactName = `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();

  await logActivity({
    orgId,
    userId,
    entityType: "workflow",
    entityId: workflowExecution.id,
    action: "created",
    details: {
      contactName,
      definitionName: definition.name,
      source: "auto_trigger",
      triggerType,
    },
  });

  try {
    const client = await getTemporalClient();
    const workflowInput: GenericWorkflowInput = {
      workflowExecutionId: workflowExecution.id,
      orgId,
      contactId: contact.id,
      contactEmail: contact.email || "",
      contactFirstName: contact.firstName ?? "",
      contactLastName: contact.lastName || "",
      contactPhone: contact.phone || "",
      definitionId: definition.id,
    };

    const temporalWorkflowId = `generic-workflow-${workflowExecution.id}`;
    const handle = await client.workflow.start("genericWorkflow", {
      taskQueue: getTemporalTaskQueue(),
      args: [workflowInput],
      workflowId: temporalWorkflowId,
    });

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

    return {
      workflowExecutionId: workflowExecution.id,
      workflowDefinitionId: definition.id,
      temporalWorkflowId: handle.workflowId,
    };
  } catch (startError) {
    const failedStatus =
      definitionStatuses.some((status) => status.id === "failed")
        ? "failed"
        : initialStatus;

    await db
      .update(workflowExecutions)
      .set({
        status: failedStatus,
        workflowExecutionState: "error",
        errorDefinition: stringifyError(startError),
        completedAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          triggerError: stringifyError(startError),
          triggerType,
        },
      })
      .where(
        and(
          eq(workflowExecutions.id, workflowExecution.id),
          eq(workflowExecutions.orgId, orgId)
        )
      );

    throw startError;
  }
}

export async function triggerWorkflowDefinitionsForContactCreated({
  orgId,
  userId,
  contact,
}: TriggerWorkflowParams): Promise<TriggerResult> {
  const definitions = await loadActiveDefinitionsWithTriggers(orgId);
  const matchingDefinitions = definitions.filter(
    (definition) => definition.trigger.type === "contact_created"
  );

  const started: TriggeredWorkflowSummary[] = [];
  const failed: TriggerFailure[] = [];

  for (const definition of matchingDefinitions) {
    try {
      const workflow = await startWorkflowExecutionForDefinition({
        orgId,
        userId,
        contact,
        definition,
        triggerType: "contact_created",
      });

      started.push(workflow);
    } catch (error) {
      console.error(
        `Auto-trigger failed for definition ${definition.id} (contact_created):`,
        error
      );
      failed.push({
        workflowDefinitionId: definition.id,
        error: stringifyError(error),
      });
    }
  }

  return { started, failed };
}

export async function triggerWorkflowDefinitionsForContactUpdated({
  orgId,
  userId,
  contact,
  changedFields,
}: TriggerWorkflowUpdateParams): Promise<TriggerResult> {
  const changedFieldSet = new Set(changedFields);
  if (changedFieldSet.size === 0) {
    return { started: [], failed: [] };
  }

  const definitions = await loadActiveDefinitionsWithTriggers(orgId);
  const matchingDefinitions = definitions.filter((definition) => {
    if (definition.trigger.type !== "contact_field_changed") {
      return false;
    }
    return shouldTriggerForFieldChange(
      definition.trigger.watchedFields,
      changedFieldSet
    );
  });

  const started: TriggeredWorkflowSummary[] = [];
  const failed: TriggerFailure[] = [];

  for (const definition of matchingDefinitions) {
    try {
      const workflow = await startWorkflowExecutionForDefinition({
        orgId,
        userId,
        contact,
        definition,
        triggerType: "contact_field_changed",
      });

      started.push(workflow);
    } catch (error) {
      console.error(
        `Auto-trigger failed for definition ${definition.id} (contact_field_changed):`,
        error
      );
      failed.push({
        workflowDefinitionId: definition.id,
        error: stringifyError(error),
      });
    }
  }

  return { started, failed };
}

export const __test__ = {
  shouldTriggerForFieldChange,
};
