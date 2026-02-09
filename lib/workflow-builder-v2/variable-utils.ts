import type {
  WorkflowDefinitionV2,
  WorkflowVariable,
  WorkflowAction,
  WorkflowTrigger,
} from "@/app/builder-test/types/workflow-v2"

/**
 * Auto-detect variables from workflow trigger and actions
 */
export function detectVariables(workflow: WorkflowDefinitionV2): WorkflowVariable[] {
  const detected: WorkflowVariable[] = []

  // Detect from trigger
  const triggerVars = detectFromTrigger(workflow.trigger)
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
 * Detect variables from trigger
 */
function detectFromTrigger(trigger: WorkflowTrigger): WorkflowVariable[] {
  const variables: WorkflowVariable[] = []

  switch (trigger.type) {
    case "manual":
    case "contact_status":
    case "api":
      // These triggers provide a contact
      variables.push({
        id: "var-contact",
        name: "Contact",
        type: "contact",
        source: { type: "trigger" },
        readOnly: true,
        fields: [
          { key: "email", label: "Email", dataType: "email" },
          { key: "firstName", label: "First Name", dataType: "text" },
          { key: "lastName", label: "Last Name", dataType: "text" },
          { key: "phone", label: "Phone", dataType: "text" },
          { key: "company", label: "Company", dataType: "text" },
        ],
      })
      break

    case "form_submission":
      // Form submission provides contact + form data
      variables.push({
        id: "var-contact",
        name: "Contact",
        type: "contact",
        source: { type: "trigger" },
        readOnly: true,
        fields: [
          { key: "email", label: "Email", dataType: "email" },
          { key: "firstName", label: "First Name", dataType: "text" },
          { key: "lastName", label: "Last Name", dataType: "text" },
          { key: "phone", label: "Phone", dataType: "text" },
          { key: "company", label: "Company", dataType: "text" },
        ],
      })
      variables.push({
        id: "var-form-submission",
        name: "Form Submission",
        type: "form_submission",
        source: { type: "trigger" },
        readOnly: true,
        fields: [
          { key: "submittedAt", label: "Submitted At", dataType: "date" },
          // Form fields would be dynamically added based on form schema
        ],
      })
      break
  }

  return variables
}

/**
 * Detect variables from action outputs
 */
function detectFromAction(action: WorkflowAction): WorkflowVariable[] {
  const variables: WorkflowVariable[] = []

  switch (action.type) {
    case "create_task":
      variables.push({
        id: `var-task-${action.id}`,
        name: `Task: ${action.config.title || "Untitled"}`,
        type: "task",
        source: { type: "action_output", actionId: action.id },
        readOnly: true,
        fields: [
          { key: "assignedTo", label: "Assigned To", dataType: "user" },
          { key: "status", label: "Status", dataType: "text" },
          { key: "outcome", label: "Outcome", dataType: "text" }, // For approval tasks
          { key: "completedAt", label: "Completed At", dataType: "date" },
        ],
      })
      break

    case "create_contact":
      variables.push({
        id: `var-contact-${action.id}`,
        name: `Contact: ${action.config.contactType}`,
        type: "contact",
        source: { type: "action_output", actionId: action.id },
        readOnly: true,
        fields: [
          { key: "email", label: "Email", dataType: "email" },
          { key: "firstName", label: "First Name", dataType: "text" },
          { key: "lastName", label: "Last Name", dataType: "text" },
          { key: "phone", label: "Phone", dataType: "text" },
        ],
      })
      break
  }

  return variables
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
 * Filter variables by data type (for context-aware selectors)
 */
export function filterVariablesByDataType(
  variables: WorkflowVariable[],
  dataType: string | string[]
): Array<{ variableId: string; fieldKey?: string; label: string; dataType: string }> {
  const types = Array.isArray(dataType) ? dataType : [dataType]
  const results: Array<{ variableId: string; fieldKey?: string; label: string; dataType: string }> = []

  variables.forEach((variable) => {
    // Check if variable itself matches (for simple variables)
    if (variable.dataType && types.includes(variable.dataType)) {
      results.push({
        variableId: variable.id,
        label: variable.name,
        dataType: variable.dataType,
      })
    }

    // Check fields (for complex variables like contact)
    if (variable.fields) {
      variable.fields.forEach((field) => {
        if (types.includes(field.dataType)) {
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
