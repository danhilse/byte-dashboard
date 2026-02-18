import type {
  WorkflowDefinitionV2,
  WorkflowVariable,
  WorkflowAction,
  WorkflowTrigger,
} from "./types"
import type { SemanticDataType } from "@/lib/field-registry/data-types"
import { isDataTypeCompatible } from "@/lib/field-registry/data-types"
import { getVariablesForTrigger } from "@/lib/field-registry/trigger-variable-pools"
import { getActionOutputVariables } from "@/lib/field-registry/action-io"

/**
 * Auto-detect variables from workflow trigger and actions
 */
export function detectVariables(workflow: WorkflowDefinitionV2): WorkflowVariable[] {
  const detected: WorkflowVariable[] = []

  // Detect from trigger
  const triggerVars = getTriggerVariables(workflow.trigger)
  detected.push(...triggerVars)

  // Detect from actions
  workflow.steps.forEach((step) => {
    step.actions.forEach((action) => {
      const actionVars = detectFromAction(action)
      detected.push(...actionVars)
    })
  })

  return detected
}

/**
 * Detect variables from trigger — delegates to field registry.
 */
export function getTriggerVariables(trigger: WorkflowTrigger): WorkflowVariable[] {
  return getVariablesForTrigger(trigger.type)
}

/**
 * Detect variables from action outputs — delegates to field registry.
 * Only produces variables for actions that actually emit outputs at runtime.
 */
function detectFromAction(action: WorkflowAction): WorkflowVariable[] {
  const label =
    action.type === "create_task"
      ? `Task: ${action.config.title || "Untitled"}`
      : action.type === "create_contact"
        ? `Contact: ${action.config.contactType}`
        : action.type

  return getActionOutputVariables(action.type, action.id, label)
}

/**
 * Get all variables for a workflow (auto-detected + custom)
 */
export function getAllVariables(workflow: WorkflowDefinitionV2): WorkflowVariable[] {
  const detected = detectVariables(workflow)
  const custom = workflow.variables.filter((v) => !v.readOnly)

  // Merge, preferring workflow-stored variables (in case user edited names)
  const merged = [...detected]
  custom.forEach((customVar) => {
    const existingIndex = merged.findIndex((v) => v.id === customVar.id)
    if (existingIndex >= 0) {
      merged[existingIndex] = customVar
    } else {
      merged.push(customVar)
    }
  })

  return merged
}

/**
 * Filter variables by data type using directional compatibility.
 * Uses isDataTypeCompatible(source, target) from the field registry.
 */
export function filterVariablesByDataType(
  variables: WorkflowVariable[],
  dataType: string | string[]
): Array<{ variableId: string; fieldKey?: string; label: string; dataType: string }> {
  const targets = Array.isArray(dataType) ? dataType : [dataType]
  const results: Array<{ variableId: string; fieldKey?: string; label: string; dataType: string }> = []

  variables.forEach((variable) => {
    // Check if variable itself matches (for simple variables)
    if (variable.dataType) {
      const source = variable.dataType as SemanticDataType
      const matches = targets.some((target) =>
        isDataTypeCompatible(source, target as SemanticDataType)
      )
      if (matches) {
        results.push({
          variableId: variable.id,
          label: variable.name,
          dataType: variable.dataType,
        })
      }
    }

    // Check fields (for complex variables like contact)
    if (variable.fields) {
      variable.fields.forEach((field) => {
        const source = field.dataType as SemanticDataType
        const matches = targets.some((target) =>
          isDataTypeCompatible(source, target as SemanticDataType)
        )
        if (matches) {
          results.push({
            variableId: variable.id,
            fieldKey: field.key,
            label: `${variable.name} → ${field.label}`,
            dataType: field.dataType,
          })
        }
      })
    }
  })

  return results
}

/**
 * Format a variable reference for storage (e.g., "var-contact.email")
 */
export function formatVariableRef(variableId: string, fieldKey?: string): string {
  return fieldKey ? `${variableId}.${fieldKey}` : variableId
}

/**
 * Parse a variable reference (e.g., "var-contact.email" → { variableId: "var-contact", fieldKey: "email" })
 */
export function parseVariableRef(ref: string): { variableId: string; fieldKey?: string } {
  const parts = ref.split(".")
  return {
    variableId: parts[0],
    fieldKey: parts[1],
  }
}

/**
 * Get display label for a variable reference
 */
export function getVariableLabel(
  ref: string,
  variables: WorkflowVariable[]
): string {
  const { variableId, fieldKey } = parseVariableRef(ref)
  const variable = variables.find((v) => v.id === variableId)

  if (!variable) return ref

  if (fieldKey && variable.fields) {
    const field = variable.fields.find((f) => f.key === fieldKey)
    return field ? `${variable.name} → ${field.label}` : ref
  }

  return variable.name
}

/**
 * Resolve any value for display — returns clean label for variable refs,
 * original string for literal values, or fallback for empty values.
 */
export function resolveDisplayValue(
  value: string | undefined,
  variables: WorkflowVariable[],
  fallback = "(not set)"
): string {
  if (!value) return fallback

  // Variable references start with "var-" or "custom-"
  if (value.startsWith("var-") || value.startsWith("custom-")) {
    return getVariableLabel(value, variables)
  }

  return value
}
