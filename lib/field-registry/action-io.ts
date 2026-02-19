// ============================================================================
// Layer 3b: Action I/O Schemas
// Runtime-aligned action inputs and outputs. Outputs must match what the
// runtime ACTUALLY emits — not what the old detectFromAction() claimed.
// ============================================================================

import type { ActionType, WorkflowVariable, WorkflowVariableField } from "@/lib/workflow-builder-v2/types"
import type { SemanticDataType } from "./data-types"
import type { EntityType } from "./entity-fields"

export interface ActionOutputField {
  key: string
  label: string
  dataType: SemanticDataType
}

export interface ActionInputField {
  key: string
  label: string
  dataType: SemanticDataType
  required?: boolean
}

export interface ActionIOSchema {
  type: ActionType
  label: string
  /** Whether the runtime compiler supports this action type. */
  runtimeSupported: boolean
  /** Entity this action operates on, if any. */
  requiresEntity?: EntityType
  inputs: readonly ActionInputField[]
  /** What the runtime ACTUALLY emits as step variables. */
  outputs: readonly ActionOutputField[]
  /** Entity type of outputs, if applicable. */
  outputEntity?: EntityType
}

/**
 * Action I/O registry — aligned with runtime reality.
 *
 * CRITICAL corrections from old detectFromAction():
 * - create_task: runtime only emits ${stepId}.taskId (generic-workflow.ts:363)
 * - create_contact: NOT runtime supported
 * - update_task: NOT runtime supported
 *
 * Wait-step outputs (emitted by advancement, not actions):
 * - wait_for_task: ${stepId}.completedBy, ${stepId}.taskId
 * - wait_for_approval: ${stepId}.outcome, ${stepId}.comment, ${stepId}.approvedBy
 */
const ACTION_IO_REGISTRY: Record<ActionType, ActionIOSchema> = {
  send_email: {
    type: "send_email",
    label: "Send Email",
    runtimeSupported: true,
    inputs: [
      { key: "to", label: "To", dataType: "email", required: true },
      { key: "subject", label: "Subject", dataType: "text", required: true },
      { key: "body", label: "Body", dataType: "textarea", required: true },
      { key: "from", label: "From", dataType: "email" },
      { key: "failurePolicy", label: "Failure Policy", dataType: "text" },
      { key: "retryCount", label: "Retry Count", dataType: "number" },
    ],
    outputs: [],
  },
  notification: {
    type: "notification",
    label: "Send Notification",
    runtimeSupported: true,
    inputs: [
      { key: "title", label: "Title", dataType: "text", required: true },
      { key: "message", label: "Message", dataType: "textarea", required: true },
    ],
    outputs: [],
  },
  create_task: {
    type: "create_task",
    label: "Create Task",
    runtimeSupported: true,
    requiresEntity: "task",
    inputs: [
      { key: "title", label: "Title", dataType: "text", required: true },
      { key: "description", label: "Description", dataType: "textarea" },
      { key: "taskType", label: "Task Type", dataType: "text", required: true },
      { key: "priority", label: "Priority", dataType: "task_priority", required: true },
    ],
    // Runtime only emits taskId (generic-workflow.ts:363)
    outputs: [
      { key: "taskId", label: "Task ID", dataType: "text" },
    ],
    outputEntity: "task",
  },
  update_contact: {
    type: "update_contact",
    label: "Update Contact",
    runtimeSupported: true,
    requiresEntity: "contact",
    inputs: [],
    outputs: [],
  },
  update_status: {
    type: "update_status",
    label: "Update Workflow Status",
    runtimeSupported: true,
    inputs: [
      { key: "status", label: "Status", dataType: "workflow_status", required: true },
    ],
    outputs: [],
  },
  set_variable: {
    type: "set_variable",
    label: "Set Variable",
    runtimeSupported: true,
    inputs: [
      { key: "variableId", label: "Variable", dataType: "text", required: true },
      { key: "value", label: "Value", dataType: "text", required: true },
    ],
    outputs: [],
  },
  update_task: {
    type: "update_task",
    label: "Update Task",
    runtimeSupported: false,
    requiresEntity: "task",
    inputs: [],
    outputs: [],
  },
  create_contact: {
    type: "create_contact",
    label: "Create Contact",
    runtimeSupported: false,
    requiresEntity: "contact",
    inputs: [],
    outputs: [],
  },
}

/** Get I/O schema for an action type. */
export function getActionIOSchema(actionType: ActionType): ActionIOSchema {
  return ACTION_IO_REGISTRY[actionType]
}

/** Whether an action type is supported by the runtime compiler. */
export function isActionRuntimeSupported(actionType: ActionType): boolean {
  return ACTION_IO_REGISTRY[actionType]?.runtimeSupported ?? false
}

/** All action types. */
export function getAllActionTypes(): readonly ActionType[] {
  return Object.keys(ACTION_IO_REGISTRY) as ActionType[]
}

/** Only runtime-supported action types. */
export function getRuntimeSupportedActionTypes(): readonly ActionType[] {
  return (Object.keys(ACTION_IO_REGISTRY) as ActionType[]).filter(
    (type) => ACTION_IO_REGISTRY[type].runtimeSupported
  )
}

/**
 * Generate output variables for an action instance.
 * Only produces variables if the action has outputs.
 */
export function getActionOutputVariables(
  actionType: ActionType,
  actionId: string,
  actionLabel: string
): WorkflowVariable[] {
  const schema = ACTION_IO_REGISTRY[actionType]
  if (!schema || schema.outputs.length === 0) return []

  const fields: WorkflowVariableField[] = schema.outputs.map((output) => ({
    key: output.key,
    label: output.label,
    dataType: output.dataType,
  }))

  return [
    {
      id: `var-task-${actionId}`,
      name: actionLabel,
      type: schema.outputEntity === "task" ? "task" : "custom",
      source: { type: "action_output", actionId },
      readOnly: true,
      fields,
    },
  ]
}
