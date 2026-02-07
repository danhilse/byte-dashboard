/**
 * Database Activities for Temporal Workflows
 *
 * These activities perform database operations that workflows orchestrate.
 * They handle task creation, status updates, and contact management.
 */

import { db } from "@/lib/db";
import { tasks, workflows, contacts, workflowDefinitions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { TaskType, TaskPriority, WorkflowStep } from "@/types";

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
  dueDate?: Date;
  contactId?: string;
  createdByStepId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates a task in the database
 *
 * @param workflowId - The workflow execution ID (for workflow-created tasks)
 * @param config - Task configuration
 * @returns The created task ID
 */
export async function createTask(
  workflowId: string,
  config: CreateTaskConfig
): Promise<string> {
  console.log(`Activity: Creating task "${config.title}" for workflow ${workflowId}`);

  const [task] = await db
    .insert(tasks)
    .values({
      orgId: config.orgId,
      workflowId,
      contactId: config.contactId,
      assignedTo: config.assignedTo,
      assignedRole: config.assignedRole,
      title: config.title,
      description: config.description,
      taskType: config.taskType || "standard",
      status: "todo",
      priority: config.priority || "medium",
      dueDate: config.dueDate ? config.dueDate.toISOString().split('T')[0] : undefined,
      createdByStepId: config.createdByStepId,
      metadata: config.metadata || {},
    })
    .returning({ id: tasks.id });

  console.log(`Activity: Task created with ID ${task.id}`);
  return task.id;
}

/**
 * Updates a workflow execution status
 *
 * IMPORTANT: This is the ONLY function that should update workflow status.
 * Status updates must come through Temporal activities to maintain consistency.
 *
 * @param workflowId - The workflow execution ID
 * @param status - The new status
 */
export async function setWorkflowStatus(
  workflowId: string,
  status: string
): Promise<void> {
  console.log(`Activity: Updating workflow ${workflowId} status to "${status}"`);

  await db
    .update(workflows)
    .set({
      status,
      updatedByTemporal: true, // Flag to indicate this was updated by Temporal
      updatedAt: new Date(),
      ...(status === "completed" || status === "approved" || status === "rejected"
        ? { completedAt: new Date() }
        : {}),
    })
    .where(eq(workflows.id, workflowId));

  console.log(`Activity: Workflow status updated to "${status}"`);
}

/**
 * Updates workflow execution current step/phase
 *
 * @param workflowId - The workflow execution ID
 * @param stepId - Current step ID
 * @param phaseId - Current phase ID (optional)
 */
export async function setWorkflowProgress(
  workflowId: string,
  stepId: string,
  phaseId?: string
): Promise<void> {
  console.log(`Activity: Updating workflow ${workflowId} progress - step: ${stepId}, phase: ${phaseId}`);

  await db
    .update(workflows)
    .set({
      currentStepId: stepId,
      currentPhaseId: phaseId,
      updatedAt: new Date(),
    })
    .where(eq(workflows.id, workflowId));

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

  await db
    .update(contacts)
    .set({
      ...fields,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId));

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

  await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, taskId));

  console.log(`Activity: Task updated`);
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
): Promise<{ steps: WorkflowStep[]; phases: unknown[]; variables: Record<string, unknown> }> {
  console.log(`Activity: Fetching workflow definition ${definitionId}`);

  const [definition] = await db
    .select({
      steps: workflowDefinitions.steps,
      phases: workflowDefinitions.phases,
      variables: workflowDefinitions.variables,
    })
    .from(workflowDefinitions)
    .where(eq(workflowDefinitions.id, definitionId));

  if (!definition) {
    console.log(`Activity: Workflow definition ${definitionId} not found`);
    return { steps: [], phases: [], variables: {} };
  }

  const stepsData = definition.steps as { steps: WorkflowStep[] };
  return {
    steps: stepsData.steps ?? [],
    phases: (definition.phases as unknown[]) ?? [],
    variables: (definition.variables as Record<string, unknown>) ?? {},
  };
}
