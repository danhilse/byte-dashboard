/**
 * Database Activities for Temporal Workflows
 *
 * These activities perform database operations that workflows orchestrate.
 * They handle task creation, status updates, and contact management.
 */

import { db } from "@/lib/db";
import { tasks, workflowExecutions, contacts, workflowDefinitions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type {
  TaskType,
  TaskPriority,
  WorkflowStep,
  DefinitionStatus,
  WorkflowExecutionState,
  WorkflowNotificationRecipients,
} from "@/types";
import { logActivity } from "@/lib/db/log-activity";
import {
  compileAuthoringToRuntime,
  fromDefinitionToAuthoring,
  hasPersistedAuthoringPayload,
  type DefinitionRecordLike,
} from "@/lib/workflow-builder-v2/adapters/definition-runtime-adapter";
import {
  createTaskAssignedNotification,
  createWorkflowActionNotifications,
} from "@/lib/notifications/service";
import { normalizeTaskMetadata } from "@/lib/tasks/presentation";

/**
 * Configuration for creating a task
 */
export interface CreateTaskConfig {
  orgId: string;
  title: string;
  description?: string;
  taskType?: TaskType;
  assignedRole?: string;
  assignedTo?: string;
  priority?: TaskPriority;
  dueDate?: Date | string | number;
  contactId?: string;
  createdByStepId?: string;
  metadata?: Record<string, unknown>;
}

function toTaskDueDate(dueDate: CreateTaskConfig["dueDate"]): string | undefined {
  if (dueDate === undefined || dueDate === null || dueDate === "") {
    return undefined;
  }

  if (typeof dueDate === "string") {
    const trimmedDueDate = dueDate.trim();
    if (!trimmedDueDate) {
      return undefined;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDueDate)) {
      return trimmedDueDate;
    }

    dueDate = trimmedDueDate;
  }

  const parsedDueDate = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (Number.isNaN(parsedDueDate.getTime())) {
    return undefined;
  }

  return parsedDueDate.toISOString().split("T")[0];
}

/**
 * Creates a task in the database
 *
 * @param workflowExecutionId - The workflow execution ID (for workflow-created tasks)
 * @param config - Task configuration
 * @returns The created task ID
 */
export async function createTask(
  workflowExecutionId: string,
  config: CreateTaskConfig
): Promise<string> {
  console.log(`Activity: Creating task "${config.title}" for workflow ${workflowExecutionId}`);
  const dueDate = toTaskDueDate(config.dueDate);
  if (config.dueDate !== undefined && dueDate === undefined) {
    console.warn(
      `Activity: Received invalid dueDate for task "${config.title}". Skipping due date assignment.`,
      config.dueDate
    );
  }

  const [task] = await db
    .insert(tasks)
    .values({
      orgId: config.orgId,
      workflowExecutionId: workflowExecutionId,
      contactId: config.contactId,
      assignedTo: config.assignedTo,
      assignedRole: config.assignedRole,
      title: config.title,
      description: config.description,
      taskType: config.taskType || "standard",
      status: "todo",
      priority: config.priority || "medium",
      dueDate,
      createdByStepId: config.createdByStepId,
      metadata: normalizeTaskMetadata(config.metadata),
    })
    .returning({ id: tasks.id });

  console.log(`Activity: Task created with ID ${task.id}`);

  await logActivity({
    orgId: config.orgId,
    userId: null, // System-generated (Temporal)
    entityType: "task",
    entityId: task.id,
    action: "created",
    details: { title: config.title, source: "workflow" },
  });

  try {
    await createTaskAssignedNotification({
      orgId: config.orgId,
      userId: config.assignedTo,
      taskId: task.id,
      taskTitle: config.title,
      assignedByUserId: null,
    });
  } catch (notificationError) {
    console.error(
      `Activity: Failed to create task assignment notification for task ${task.id}`,
      notificationError
    );
  }

  return task.id;
}

/**
 * Updates a workflow execution status
 *
 * Business status updates must come through Temporal activities to maintain consistency.
 *
 * @param workflowExecutionId - The workflow execution ID
 * @param status - The new status
 */
export async function setWorkflowStatus(
  workflowExecutionId: string,
  status: string,
  options?: {
    markCompletedAt?: boolean;
    workflowExecutionState?: WorkflowExecutionState;
    errorDefinition?: string;
  }
): Promise<void> {
  console.log(`Activity: Updating workflow ${workflowExecutionId} status to "${status}"`);

  const inferredExecutionState: WorkflowExecutionState =
    options?.workflowExecutionState ??
    (status === "failed"
      ? "error"
      : status === "timeout"
        ? "timeout"
        : options?.markCompletedAt
          ? "completed"
          : "running");

  const shouldSetCompletedAt =
    options?.markCompletedAt ??
    inferredExecutionState !== "running";

  const [updatedWorkflow] = await db
    .update(workflowExecutions)
    .set({
      status,
      workflowExecutionState: inferredExecutionState,
      errorDefinition:
        options?.errorDefinition !== undefined
          ? options.errorDefinition
          : inferredExecutionState === "error"
            ? `Workflow entered error state while setting status "${status}"`
            : null,
      updatedByTemporal: true, // Flag to indicate this was updated by Temporal
      updatedAt: new Date(),
      ...(shouldSetCompletedAt
        ? { completedAt: new Date() }
        : {}),
    })
    .where(eq(workflowExecutions.id, workflowExecutionId))
    .returning({ orgId: workflowExecutions.orgId });

  if (updatedWorkflow) {
    await logActivity({
      orgId: updatedWorkflow.orgId,
      userId: null, // System-generated (Temporal)
      entityType: "workflow",
      entityId: workflowExecutionId,
      action: "status_changed",
      details: {
        status,
        workflowExecutionState: inferredExecutionState,
        source: "temporal",
      },
    });
  }

  console.log(`Activity: Workflow status updated to "${status}"`);
}

/**
 * Updates internal workflow execution state independent from business status.
 */
export async function setWorkflowExecutionState(
  workflowExecutionId: string,
  workflowExecutionState: WorkflowExecutionState,
  options?: { errorDefinition?: string }
): Promise<void> {
  console.log(
    `Activity: Updating workflow ${workflowExecutionId} execution state to "${workflowExecutionState}"`
  );

  const isTerminal = workflowExecutionState !== "running";

  const [updatedWorkflow] = await db
    .update(workflowExecutions)
    .set({
      workflowExecutionState,
      errorDefinition:
        options?.errorDefinition !== undefined
          ? options.errorDefinition
          : workflowExecutionState === "error"
            ? "Workflow failed without explicit error definition."
            : null,
      updatedByTemporal: true,
      updatedAt: new Date(),
      ...(isTerminal ? { completedAt: new Date() } : {}),
    })
    .where(eq(workflowExecutions.id, workflowExecutionId))
    .returning({ orgId: workflowExecutions.orgId });

  if (updatedWorkflow) {
    await logActivity({
      orgId: updatedWorkflow.orgId,
      userId: null,
      entityType: "workflow",
      entityId: workflowExecutionId,
      action: "status_changed",
      details: { workflowExecutionState, source: "temporal" },
    });
  }

  console.log(
    `Activity: Workflow execution state updated to "${workflowExecutionState}"`
  );
}

/**
 * Updates workflow execution current step/phase
 *
 * @param workflowExecutionId - The workflow execution ID
 * @param stepId - Current step ID
 * @param phaseId - Current phase ID (optional)
 */
export async function setWorkflowProgress(
  workflowExecutionId: string,
  stepId: string,
  phaseId?: string
): Promise<void> {
  console.log(
    `Activity: Updating workflow ${workflowExecutionId} progress - step: ${stepId}${
      phaseId ? `, phase: ${phaseId}` : ""
    }`
  );

  await db
    .update(workflowExecutions)
    .set({
      currentStepId: stepId,
      currentPhaseId: phaseId,
      updatedAt: new Date(),
    })
    .where(eq(workflowExecutions.id, workflowExecutionId));

  console.log(`Activity: Workflow progress updated`);
}

/**
 * Updates contact fields
 *
 * @param contactId - The contact ID
 * @param fields - Fields to update
 */
export async function updateContact(
  contactId: string,
  fields: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zip?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }
): Promise<void> {
  console.log(`Activity: Updating contact ${contactId}`);

  const [updatedContact] = await db
    .update(contacts)
    .set({
      ...fields,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId))
    .returning({ orgId: contacts.orgId });

  if (updatedContact) {
    const updatedFields = Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key);

    await logActivity({
      orgId: updatedContact.orgId,
      userId: null, // System-generated (Temporal)
      entityType: "contact",
      entityId: contactId,
      action: "updated",
      details: { source: "workflow", fields: updatedFields },
    });
  }

  console.log(`Activity: Contact updated`);
}

/**
 * Updates a task's fields
 *
 * @param taskId - The task ID
 * @param fields - Fields to update
 */
export async function updateTask(
  taskId: string,
  fields: {
    status?: string;
    priority?: string;
    description?: string;
    assignedRole?: string;
    assignedTo?: string;
  }
): Promise<void> {
  console.log(`Activity: Updating task ${taskId}`);

  const [existingTask] = await db
    .select({
      id: tasks.id,
      assignedTo: tasks.assignedTo,
      title: tasks.title,
    })
    .from(tasks)
    .where(eq(tasks.id, taskId));

  if (!existingTask) {
    throw new Error(`Task ${taskId} not found`);
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (fields.status !== undefined) {
    if (!["backlog", "todo", "in_progress", "done"].includes(fields.status)) {
      throw new Error(`Invalid task status "${fields.status}"`);
    }

    if (fields.status === "done") {
      throw new Error(
        'updateTask cannot set status to "done"; use task completion APIs/signals'
      );
    }

    updateData.status = fields.status;
    updateData.completedAt = null;
  }

  if (fields.priority !== undefined) {
    if (!["low", "medium", "high", "urgent"].includes(fields.priority)) {
      throw new Error(`Invalid task priority "${fields.priority}"`);
    }
    updateData.priority = fields.priority;
  }

  if (fields.description !== undefined) {
    updateData.description = fields.description;
  }

  if (fields.assignedRole !== undefined) {
    updateData.assignedRole = fields.assignedRole;
  }

  if (fields.assignedTo !== undefined) {
    updateData.assignedTo = fields.assignedTo;
  }

  if (Object.keys(updateData).length === 1) {
    throw new Error(
      "updateTask called without any valid task fields to update"
    );
  }

  const [updatedTask] = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, taskId))
    .returning({
      orgId: tasks.orgId,
      assignedTo: tasks.assignedTo,
      title: tasks.title,
    });

  if (updatedTask) {
    await logActivity({
      orgId: updatedTask.orgId,
      userId: null, // System-generated (Temporal)
      entityType: "task",
      entityId: taskId,
      action: "updated",
      details: { source: "workflow", fields: Object.keys(fields) },
    });

    if (
      updatedTask.assignedTo &&
      updatedTask.assignedTo !== existingTask.assignedTo
    ) {
      try {
        await createTaskAssignedNotification({
          orgId: updatedTask.orgId,
          userId: updatedTask.assignedTo,
          taskId,
          taskTitle: updatedTask.title ?? existingTask.title ?? "Task",
          assignedByUserId: null,
        });
      } catch (notificationError) {
        console.error(
          `Activity: Failed to create reassignment notification for task ${taskId}`,
          notificationError
        );
      }
    }
  }

  console.log(`Activity: Task updated`);
}

/**
 * Creates in-app notifications from workflow notification actions.
 */
export async function notifyUsers(
  workflowExecutionId: string,
  config: {
    orgId: string;
    recipients: WorkflowNotificationRecipients;
    title: string;
    message: string;
  }
): Promise<number> {
  console.log(`Activity: Creating notifications for workflow ${workflowExecutionId}`);

  const createdCount = await createWorkflowActionNotifications({
    orgId: config.orgId,
    workflowExecutionId,
    recipients: config.recipients,
    title: config.title,
    message: config.message,
    metadata: { source: "workflow_action" },
  });

  console.log(
    `Activity: Created ${createdCount} notifications for workflow ${workflowExecutionId}`
  );
  return createdCount;
}

/**
 * Gets a task by ID
 *
 * @param taskId - The task ID
 * @returns The task or null if not found
 */
export async function getTask(taskId: string) {
  console.log(`Activity: Fetching task ${taskId}`);

  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId));

  return task || null;
}

/**
 * Gets a workflow definition by ID
 *
 * Used by the generic workflow interpreter to fetch the step definitions.
 *
 * @param definitionId - The workflow definition ID
 * @returns The definition's steps array, or empty array if not found
 */
export async function getWorkflowDefinition(
  definitionId: string
): Promise<{
  steps: WorkflowStep[];
  phases: unknown[];
  variables: Record<string, unknown>;
  statuses: DefinitionStatus[];
}> {
  console.log(`Activity: Fetching workflow definition ${definitionId}`);

  const [definition] = await db
    .select({
      id: workflowDefinitions.id,
      name: workflowDefinitions.name,
      description: workflowDefinitions.description,
      steps: workflowDefinitions.steps,
      phases: workflowDefinitions.phases,
      variables: workflowDefinitions.variables,
      statuses: workflowDefinitions.statuses,
      createdAt: workflowDefinitions.createdAt,
      updatedAt: workflowDefinitions.updatedAt,
    })
    .from(workflowDefinitions)
    .where(eq(workflowDefinitions.id, definitionId));

  if (!definition) {
    console.log(`Activity: Workflow definition ${definitionId} not found`);
    return { steps: [], phases: [], variables: {}, statuses: [] };
  }

  const statuses = (definition.statuses as DefinitionStatus[]) ?? [];
  let steps = (definition.steps as WorkflowStep[]) ?? [];

  if (hasPersistedAuthoringPayload(definition.variables)) {
    try {
      const authoring = fromDefinitionToAuthoring({
        ...(definition as unknown as DefinitionRecordLike),
        id: definition.id,
        name: definition.name,
        description: definition.description,
        createdAt: definition.createdAt.toISOString(),
        updatedAt: definition.updatedAt.toISOString(),
      });
      steps = compileAuthoringToRuntime(authoring, {
        definitionStatuses: statuses,
      });
    } catch (compileError) {
      console.error(
        `Activity: Failed to compile authoring payload for definition ${definitionId}; falling back to stored runtime steps`,
        compileError
      );
    }
  }

  return {
    steps,
    phases: (definition.phases as unknown[]) ?? [],
    variables: (definition.variables as Record<string, unknown>) ?? {},
    statuses,
  };
}
