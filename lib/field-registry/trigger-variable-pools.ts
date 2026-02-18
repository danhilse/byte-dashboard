// ============================================================================
// Layer 3a: Trigger Variable Pools
// Maps each trigger type to the variable pools it provides.
// Variable fields are pulled from entity-fields — no duplication.
// ============================================================================

import type { TriggerType, WorkflowVariable, WorkflowVariableField } from "@/lib/workflow-builder-v2/types"
import type { SemanticDataType } from "./data-types"
import { getFieldDefinition, type EntityType } from "./entity-fields"

interface TriggerVariablePool {
  variableId: string
  variableName: string
  variableType: "contact" | "user" | "task" | "form_submission" | "custom"
  entity?: EntityType
  /**
   * Explicit list of field keys that the runtime actually populates.
   * Field metadata (label, dataType) is looked up from the entity-fields registry.
   * This prevents the builder from advertising variables the runtime never provides.
   */
  runtimeFieldKeys?: readonly string[]
  /** Extra fields not covered by entity registry (e.g. contact.id, form submittedAt). */
  extraFields?: WorkflowVariableField[]
}

interface TriggerPoolDefinition {
  pools: TriggerVariablePool[]
}

/**
 * Contact field keys that generic-workflow.ts actually seeds as variables.
 * See generic-workflow.ts:188-193 — only these 4 contact fields are populated.
 * `id` is also populated but isn't in the contact entity-fields, so it's an extraField.
 */
const RUNTIME_CONTACT_FIELD_KEYS = ["email", "firstName", "lastName", "phone"] as const

/**
 * Mapping each trigger type to the variable pools it provides.
 * All triggers that involve a contact provide the "contact" pool.
 * form_submission additionally provides a form_submission pool.
 */
const TRIGGER_POOLS: Record<TriggerType, TriggerPoolDefinition> = {
  manual: {
    pools: [
      {
        variableId: "var-contact",
        variableName: "Contact",
        variableType: "contact",
        runtimeFieldKeys: RUNTIME_CONTACT_FIELD_KEYS,
        extraFields: [
          { key: "id", label: "Contact ID", dataType: "text" },
        ],
      },
    ],
  },
  contact_created: {
    pools: [
      {
        variableId: "var-contact",
        variableName: "Contact",
        variableType: "contact",
        runtimeFieldKeys: RUNTIME_CONTACT_FIELD_KEYS,
        extraFields: [
          { key: "id", label: "Contact ID", dataType: "text" },
        ],
      },
    ],
  },
  contact_field_changed: {
    pools: [
      {
        variableId: "var-contact",
        variableName: "Contact",
        variableType: "contact",
        runtimeFieldKeys: RUNTIME_CONTACT_FIELD_KEYS,
        extraFields: [
          { key: "id", label: "Contact ID", dataType: "text" },
        ],
      },
    ],
  },
  form_submission: {
    pools: [
      {
        variableId: "var-contact",
        variableName: "Contact",
        variableType: "contact",
        runtimeFieldKeys: RUNTIME_CONTACT_FIELD_KEYS,
        extraFields: [
          { key: "id", label: "Contact ID", dataType: "text" },
        ],
      },
      {
        variableId: "var-form-submission",
        variableName: "Form Submission",
        variableType: "form_submission",
        extraFields: [
          { key: "submittedAt", label: "Submitted At", dataType: "date" },
        ],
      },
    ],
  },
  api: {
    pools: [
      {
        variableId: "var-contact",
        variableName: "Contact",
        variableType: "contact",
        runtimeFieldKeys: RUNTIME_CONTACT_FIELD_KEYS,
        extraFields: [
          { key: "id", label: "Contact ID", dataType: "text" },
        ],
      },
    ],
  },
}

/**
 * Look up field metadata from entity-fields registry for the given keys.
 * Only includes fields whose keys are in `runtimeFieldKeys`.
 */
function runtimeFieldsToVariableFields(
  entity: EntityType,
  runtimeFieldKeys: readonly string[]
): WorkflowVariableField[] {
  return runtimeFieldKeys
    .map((key) => {
      const field = getFieldDefinition(entity, key)
      if (!field) return null
      return {
        key: field.key,
        label: field.label,
        dataType: field.dataType as SemanticDataType,
      }
    })
    .filter((f): f is WorkflowVariableField => f !== null)
}

/**
 * Generate WorkflowVariable[] for a given trigger type.
 * Fields come from the entity-fields registry, filtered to only
 * what the runtime actually populates — single source of truth.
 */
export function getVariablesForTrigger(triggerType: TriggerType): WorkflowVariable[] {
  const definition = TRIGGER_POOLS[triggerType]
  if (!definition) return []

  return definition.pools.map((pool) => {
    const fields: WorkflowVariableField[] = []

    if (pool.runtimeFieldKeys) {
      fields.push(...runtimeFieldsToVariableFields("contact", pool.runtimeFieldKeys))
    }

    if (pool.extraFields) {
      fields.push(...pool.extraFields)
    }

    return {
      id: pool.variableId,
      name: pool.variableName,
      type: pool.variableType,
      source: { type: "trigger" as const },
      readOnly: true,
      fields: fields.length > 0 ? fields : undefined,
    }
  })
}
