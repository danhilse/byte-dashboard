/**
 * Database Activities for Temporal Workflows
 *
 * These activities perform database operations that workflows orchestrate.
 * They handle task creation, status updates, and contact management.
 */

import { db } from "@/lib/db";
import { tasks, workflows, contacts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { TaskType, TaskPriority } from "@/types";

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
