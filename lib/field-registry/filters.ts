// ============================================================================
// Layer 4: Smart Filtering Helpers
// ============================================================================

import type { WorkflowVariable } from "@/lib/workflow-builder-v2/types"
import type { SemanticDataType } from "./data-types"
import { isDataTypeCompatible } from "./data-types"
import { getWatchableFields, getFieldsForEntity, type EntityType } from "./entity-fields"

export interface VariableOption {
  variableId: string
  fieldKey?: string
  label: string
  dataType: SemanticDataType
}

/**
 * Filter variable options using directional compatibility.
 * If requiredDataTypes is ["email"], only email-type variables pass.
 * If requiredDataTypes is ["text"], text+name+email+phone+url variables pass.
 */
export function filterVariableOptions(
  variables: WorkflowVariable[],
  requiredDataTypes: SemanticDataType | SemanticDataType[]
): VariableOption[] {
  const targets = Array.isArray(requiredDataTypes) ? requiredDataTypes : [requiredDataTypes]
  const results: VariableOption[] = []

  for (const variable of variables) {
    // Check variable-level dataType
    if (variable.dataType) {
      const source = variable.dataType as SemanticDataType
      if (targets.some((target) => isDataTypeCompatible(source, target))) {
        results.push({
          variableId: variable.id,
          label: variable.name,
          dataType: source,
        })
      }
    }

    // Check field-level dataTypes
    if (variable.fields) {
      for (const field of variable.fields) {
        const source = field.dataType as SemanticDataType
        if (targets.some((target) => isDataTypeCompatible(source, target))) {
          results.push({
            variableId: variable.id,
            fieldKey: field.key,
            label: `${variable.name} → ${field.label}`,
            dataType: source,
          })
        }
      }
    }
  }

  return results
}

/**
 * Get entity fields matching one or more data types.
 */
export function filterEntityFieldsByDataType(
  entity: EntityType,
  dataTypes: SemanticDataType | SemanticDataType[]
): { key: string; label: string; dataType: SemanticDataType }[] {
  const types = Array.isArray(dataTypes) ? dataTypes : [dataTypes]
  return getFieldsForEntity(entity)
    .filter((f) => types.includes(f.dataType))
    .map((f) => ({ key: f.key, label: f.label, dataType: f.dataType }))
}

/**
 * Watchable contact field options for trigger config.
 * Replaces hardcoded CONTACT_FIELD_OPTIONS in trigger-config.tsx.
 */
export function getWatchableContactFieldOptions(): { value: string; label: string }[] {
  return getWatchableFields("contact").map((f) => ({
    value: f.key,
    label: f.label,
  }))
}

/**
 * Data types available for custom variable creation.
 * Used in workflow-config-dialog and set-variable-config.
 */
const CUSTOM_VARIABLE_DATA_TYPES: readonly { value: SemanticDataType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
]

export function getCustomVariableDataTypeOptions(): readonly { value: SemanticDataType; label: string }[] {
  return CUSTOM_VARIABLE_DATA_TYPES
}
