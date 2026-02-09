// ============================================================================
// Workflow Builder V2 - Type Definitions (Updated)
// ============================================================================

import type { DefinitionStatus } from "@/types"

// Re-export as WorkflowStatus for V2 compatibility
export type WorkflowStatus = DefinitionStatus

// Workflow-level trigger (how workflows start)
export type WorkflowTrigger =
  | { type: "manual" }
  | { type: "contact_status"; statusValue: string }
  | { type: "form_submission"; formId: string }
  | { type: "api" }

// Action types (what happens in a step)
export type WorkflowAction =
  | {
      type: "send_email"
      id: string // Unique ID to reference in conditions
      config: {
        to: string // Email or variable like {{contact.email}}
        subject: string
        body: string
        from?: string
      }
    }
  | {
      type: "create_task"
      id: string
      config: {
        title: string
        description?: string
        taskType: "standard" | "approval"
        assignTo: { type: "role"; role: string } | { type: "user"; userId: string }
        priority: "low" | "medium" | "high"
        dueDays?: number
      }
    }
  | {
      type: "update_contact"
      id: string
      config: {
        fields: Array<{ field: string; value: string }>
      }
    }
  | {
      type: "update_status"
      id: string
      config: {
        status: string // Workflow status value
      }
    }
  | {
      type: "update_task"
      id: string
      config: {
        taskActionId: string // Reference to create_task action ID
        fields: Array<{ field: string; value: string }>
      }
    }
  | {
      type: "create_contact"
      id: string
      config: {
        contactType: "reference" | "secondary" // Type of contact to create
        fields: Array<{ field: string; value: string }>
      }
    }
  | {
      type: "set_variable"
      id: string
      config: {
        variableId: string // ID of custom variable to set
        value: string // Value to set (can be literal or variable ref)
      }
    }

// Simple advancement conditions
export type SimpleCondition =
  | {
      type: "automatic"
    }
  | {
      type: "when_task_completed"
      config: {
        taskActionId: string // Which create_task action to wait for
      }
    }
  | {
      type: "when_any_task_completed"
      config: {
        taskActionIds: string[] // Wait for ANY of these tasks
      }
    }
  | {
      type: "when_all_tasks_completed"
      config: {
        taskActionIds: string[] // Wait for ALL of these tasks
      }
    }
  | {
      type: "when_approved"
      config: {
        taskActionId: string // Which create_task action (must be taskType: "approval")
        onApproved: "next" | { gotoStepId: string }
        onRejected: "next" | { gotoStepId: string } | "end"
      }
    }
  | {
      type: "when_form_submitted"
      config: {
        formId: string // External form ID
        conditions?: {
          // Optional: advance only if form field matches
          field: string
          value: string
        }
      }
    }
  | {
      type: "when_duration_passes"
      config: {
        duration: number
        unit: "hours" | "days" | "weeks"
      }
    }
  | {
      type: "when_manually_advanced"
      config: {
        buttonLabel?: string // Optional custom button label
      }
    }
  | {
      type: "conditional_branches"
      config: {
        field: string // Variable to check (e.g., "{{action_1.outcome}}")
        branches: Array<{
          condition: "equals" | "not_equals" | "contains"
          value: string
          gotoStepId: string
        }>
        default: "next" | { gotoStepId: string } | "end"
      }
    }

// Compound advancement conditions (AND/OR logic)
export type CompoundCondition = {
  type: "compound"
  operator: "AND" | "OR"
  conditions: AdvancementCondition[] // Can nest compound conditions
}

// Union of simple and compound conditions
export type AdvancementCondition = SimpleCondition | CompoundCondition

// ============================================================================
// Step Types - Union type for standard and branch steps
// ============================================================================

// Standard step structure (existing step type)
export interface StandardStepV2 {
  id: string
  name: string // User-visible label
  stepType?: "standard" // Optional discriminator for type guards
  description?: string // Optional description
  actions: WorkflowAction[]
  advancementCondition: AdvancementCondition
  phaseId?: string // Optional phase grouping
}

// Branch step structure (new for conditional branching)
export interface BranchStepV2 {
  id: string
  name: string
  stepType: "branch" // Required discriminator
  description?: string

  // Branching condition (always a variable check)
  condition: {
    variableRef: string // e.g., "var-contact.status" or "var-action-1.outcome"
    operator: "equals" | "not_equals" | "contains" | "not_contains" | "in" | "not_in"
    compareValue: string | string[] // Single value, variable ref, or array for "in"/"not_in" operators
  }

  // Two execution tracks (A/B split)
  tracks: [
    {
      id: string
      label: string // "Approved", "Yes", "Track A"
      steps: StandardStepV2[] // Nested steps (MVP: only standard steps, no nested branches)
    },
    {
      id: string
      label: string // "Rejected", "No", "Track B"
      steps: StandardStepV2[] // Nested steps
    }
  ]

  // Branch steps have no actions (actions live in track steps)
  actions: []

  // Use normal advancement condition (automatic, wait for task, duration, etc.)
  advancementCondition: AdvancementCondition

  phaseId?: string // Optional phase grouping

  // UI state (not persisted to backend)
  isExpanded?: boolean
}

// Union type for all step types
export type WorkflowStepV2 = StandardStepV2 | BranchStepV2

// Phase grouping
export interface WorkflowPhase {
  id: string
  name: string
  color?: string
  order: number // Explicit ordering
}

// ============================================================================
// Variable System
// ============================================================================

// Data types for variables
export type VariableDataType =
  | "email"
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "user"  // Special type for user/assignee selection

// Variable types categorize the source/nature of the variable
export type VariableType =
  | "contact"           // Contact data from trigger
  | "user"              // User/team member
  | "task"              // Task created by action
  | "form_submission"   // Form submission data
  | "custom"            // User-defined static value

// Where the variable's value comes from
export type VariableSource =
  | { type: "trigger" }                                    // From workflow trigger
  | { type: "action_output"; actionId: string }            // From action output
  | { type: "custom"; value?: string | number | boolean }  // Static/hardcoded value

// Field within a complex variable (e.g., contact.email)
export interface WorkflowVariableField {
  key: string         // Field key (e.g., "email", "firstName")
  label: string       // Display label (e.g., "Email", "First Name")
  dataType: VariableDataType
}

// Workflow variable definition
export interface WorkflowVariable {
  id: string
  name: string        // Display name (e.g., "Contact", "Review Task")
  type: VariableType
  dataType?: VariableDataType  // For simple variables (custom values)
  source: VariableSource
  fields?: WorkflowVariableField[]  // For complex types with multiple fields
  readOnly?: boolean  // Auto-detected variables can't be edited/deleted
}

// Workflow definition
export interface WorkflowDefinitionV2 {
  id: string
  name: string
  description?: string
  trigger: WorkflowTrigger
  contactRequired: boolean // Always true for MVP
  steps: WorkflowStepV2[]
  phases: WorkflowPhase[]
  statuses: WorkflowStatus[] // Workflow-specific statuses
  variables: WorkflowVariable[] // Type-safe variables system
  createdAt: string
  updatedAt: string
}

// ============================================================================
// Helper Types
// ============================================================================

export type ActionType = WorkflowAction["type"]
export type SimpleConditionType = SimpleCondition["type"]
export type TriggerType = WorkflowTrigger["type"]

// Extract config type for a specific action type
export type ActionConfig<T extends ActionType> = Extract<
  WorkflowAction,
  { type: T }
>["config"]

// Extract config type for a specific condition type
export type ConditionConfig<T extends SimpleConditionType> = Extract<
  SimpleCondition,
  { type: T }
> extends { config: infer C }
  ? C
  : never

// Type guard for compound conditions
export function isCompoundCondition(
  condition: AdvancementCondition
): condition is CompoundCondition {
  return condition.type === "compound"
}

// Type guard for simple conditions
export function isSimpleCondition(
  condition: AdvancementCondition
): condition is SimpleCondition {
  return condition.type !== "compound"
}

// Type guard for branch steps
export function isBranchStep(step: WorkflowStepV2): step is BranchStepV2 {
  return (step as BranchStepV2).stepType === "branch"
}

// Type guard for standard steps
export function isStandardStep(step: WorkflowStepV2): step is StandardStepV2 {
  return !isBranchStep(step)
}
