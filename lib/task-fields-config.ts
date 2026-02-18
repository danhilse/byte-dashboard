// ============================================================================
// Task Fields Configuration — derived from field registry
// ============================================================================

import type { FieldInputType } from "./field-input-types"
import { getFieldsForEntity, TASK_FIELD_KEYS, type TaskFieldKey } from "@/lib/field-registry"

export type TaskField = TaskFieldKey

export const allTaskFields = TASK_FIELD_KEYS

const taskFieldDefs = getFieldsForEntity("task")

export const taskFieldConfig = Object.fromEntries(
  taskFieldDefs.map((f) => [
    f.key,
    {
      label: f.label,
      description: f.description,
      inputType: f.inputType,
    },
  ])
) as Record<TaskField, { label: string; description?: string; inputType: FieldInputType }>

export const taskFieldOptions = taskFieldDefs.map((f) => ({
  value: f.key as TaskField,
  label: f.label,
}))
