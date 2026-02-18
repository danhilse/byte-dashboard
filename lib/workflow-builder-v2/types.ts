import type { DefinitionStatus } from "@/types"

export type WorkflowStatus = DefinitionStatus

type TriggerWithInitialStatus = {
  initialStatus?: string
}

export type WorkflowTrigger =
  | ({ type: "manual" } & TriggerWithInitialStatus)
  | ({ type: "contact_created" } & TriggerWithInitialStatus)
  | ({ type: "contact_field_changed"; watchedFields: string[] } & TriggerWithInitialStatus)
  | ({ type: "form_submission"; formId: string } & TriggerWithInitialStatus)
  | ({ type: "api" } & TriggerWithInitialStatus)

export type WorkflowAction =
  | {
      type: "send_email"
      id: string
      config: {
        to: string
        subject: string
        body: string
        from?: string
      }
    }
  | {
      type: "notification"
      id: string
      config: {
        recipients:
          | { type: "user"; userId: string }
          | { type: "group"; groupIds: string[] }
          | { type: "role"; role: string }
          | { type: "organization" }
        title: string
        message: string
      }
    }
  | {
      type: "create_task"
      id: string
      config: {
        title: string
        description?: string
        links?: string[]
        taskType: "standard" | "approval"
        assignTo: { type: "role"; role: string } | { type: "user"; userId: string }
        priority: "low" | "medium" | "high" | "urgent"
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
        status: string
      }
    }
  | {
      type: "update_task"
      id: string
      config: {
        taskActionId: string
        fields: Array<{ field: string; value: string }>
      }
    }
  | {
      type: "create_contact"
      id: string
      config: {
        contactType: "reference" | "secondary"
        fields: Array<{ field: string; value: string }>
      }
    }
  | {
      type: "set_variable"
      id: string
      config: {
        variableId: string
        value: string
      }
    }

export type SimpleCondition =
  | {
      type: "automatic"
    }
  | {
      type: "when_task_completed"
      config: {
        taskActionId: string
      }
    }
  | {
      type: "when_multiple_tasks_completed"
      config: {
        taskActionIds: string[]
        operator: "ANY" | "ALL"
      }
    }
  | {
      type: "when_approved"
      config: {
        taskActionId: string
        onApproved: "next" | { gotoStepId: string }
        onRejected: "next" | { gotoStepId: string } | "end"
      }
    }
  | {
      type: "when_form_submitted"
      config: {
        formId: string
        conditions?: {
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
        buttonLabel?: string
      }
    }
  | {
      type: "conditional_branches"
      config: {
        field: string
        branches: Array<{
          condition: "equals" | "not_equals" | "contains"
          value: string
          gotoStepId: string
        }>
        default: "next" | { gotoStepId: string } | "end"
      }
    }

export type CompoundCondition = {
  type: "compound"
  operator: "AND" | "OR"
  conditions: AdvancementCondition[]
}

export type AdvancementCondition = SimpleCondition | CompoundCondition

export interface StandardStepV2 {
  id: string
  name: string
  stepType?: "standard"
  description?: string
  actions: WorkflowAction[]
  advancementCondition: AdvancementCondition
  phaseId?: string
}

export interface BranchStepV2 {
  id: string
  name: string
  stepType: "branch"
  description?: string
  condition: {
    variableRef: string
    operator: "equals" | "not_equals" | "contains" | "not_contains" | "in" | "not_in"
    compareValue: string | string[]
  }
  tracks: [
    {
      id: string
      label: string
      steps: StandardStepV2[]
    },
    {
      id: string
      label: string
      steps: StandardStepV2[]
    }
  ]
  actions: []
  advancementCondition: AdvancementCondition
  phaseId?: string
  isExpanded?: boolean
}

export type WorkflowStepV2 = StandardStepV2 | BranchStepV2

export interface WorkflowPhase {
  id: string
  name: string
  color?: string
  order: number
}

import type { SemanticDataType } from "@/lib/field-registry/data-types"

/**
 * Alias for backward compatibility.
 * All original values ("email" | "text" | "number" | "date" | "boolean" | "user")
 * are preserved as members of SemanticDataType.
 */
export type VariableDataType = SemanticDataType

export type VariableType = "contact" | "user" | "task" | "form_submission" | "custom"

export type VariableSource =
  | { type: "trigger" }
  | { type: "action_output"; actionId: string }
  | { type: "custom"; value?: string | number | boolean }

export interface WorkflowVariableField {
  key: string
  label: string
  dataType: VariableDataType
}

export interface WorkflowVariable {
  id: string
  name: string
  type: VariableType
  dataType?: VariableDataType
  source: VariableSource
  fields?: WorkflowVariableField[]
  readOnly?: boolean
}

export interface WorkflowDefinitionV2 {
  id: string
  name: string
  description?: string
  trigger: WorkflowTrigger
  contactRequired: boolean
  steps: WorkflowStepV2[]
  phases: WorkflowPhase[]
  statuses: WorkflowStatus[]
  variables: WorkflowVariable[]
  createdAt: string
  updatedAt: string
}

export type ActionType = WorkflowAction["type"]
export type SimpleConditionType = SimpleCondition["type"]
export type TriggerType = WorkflowTrigger["type"]

export type ActionConfig<T extends ActionType> = Extract<WorkflowAction, { type: T }>["config"]

export type ConditionConfig<T extends SimpleConditionType> = Extract<
  SimpleCondition,
  { type: T }
> extends { config: infer C }
  ? C
  : never

export function isCompoundCondition(
  condition: AdvancementCondition
): condition is CompoundCondition {
  return condition.type === "compound"
}

export function isSimpleCondition(
  condition: AdvancementCondition
): condition is SimpleCondition {
  return condition.type !== "compound"
}

export function isBranchStep(step: WorkflowStepV2): step is BranchStepV2 {
  return (step as BranchStepV2).stepType === "branch"
}

export function isStandardStep(step: WorkflowStepV2): step is StandardStepV2 {
  return !isBranchStep(step)
}
