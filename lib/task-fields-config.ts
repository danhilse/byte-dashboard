// ============================================================================
// Task Fields Configuration — derived from field registry
// ============================================================================

import type { FieldInputType } from "./field-input-types"
import { getFieldsForEntity } from "@/lib/field-registry"

const taskFieldDefs = getFieldsForEntity("task")

export type TaskField = (typeof taskFieldDefs)[number]["key"]

export const allTaskFields: readonly string[] = taskFieldDefs.map((f) => f.key)

export const taskFieldConfig: Record<string, { label: string; description?: string; inputType: FieldInputType }> =
  Object.fromEntries(
    taskFieldDefs.map((f) => [
      f.key,
      {
        label: f.label,
        description: f.description,
        inputType: f.inputType,
      },
    ])
  )

export const taskFieldOptions = taskFieldDefs.map((f) => ({
  value: f.key,
  label: f.label,
}))
