// ============================================================================
// Layer 3a: Trigger Variable Pools
// Maps each trigger type to the variable pools it provides.
// Variable fields are pulled from entity-fields — no duplication.
// ============================================================================

import type { TriggerType, WorkflowVariable, WorkflowVariableField } from "@/lib/workflow-builder-v2/types"
import type { SemanticDataType } from "./data-types"
import { getFieldsForEntity, type EntityType } from "./entity-fields"

interface TriggerVariablePool {
  variableId: string
  variableName: string
  variableType: "contact" | "user" | "task" | "form_submission" | "custom"
  entity?: EntityType
  /** If set, fields are derived from entity-fields registry. */
  deriveFieldsFromEntity?: EntityType
  /** Extra fields not covered by entity registry (e.g. form submittedAt). */
  extraFields?: WorkflowVariableField[]
}

interface TriggerPoolDefinition {
  pools: TriggerVariablePool[]
}

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
        deriveFieldsFromEntity: "contact",
      },
    ],
  },
  contact_created: {
    pools: [
      {
        variableId: "var-contact",
        variableName: "Contact",
        variableType: "contact",
        deriveFieldsFromEntity: "contact",
      },
    ],
  },
  contact_field_changed: {
    pools: [
      {
        variableId: "var-contact",
        variableName: "Contact",
        variableType: "contact",
        deriveFieldsFromEntity: "contact",
      },
    ],
  },
  form_submission: {
    pools: [
      {
        variableId: "var-contact",
        variableName: "Contact",
        variableType: "contact",
        deriveFieldsFromEntity: "contact",
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
        deriveFieldsFromEntity: "contact",
      },
    ],
  },
}

function entityFieldsToVariableFields(entity: EntityType): WorkflowVariableField[] {
  const fields = getFieldsForEntity(entity)
  return fields
    .filter((f) => !f.isReadOnly)
    .map((f) => ({
      key: f.key,
      label: f.label,
      dataType: f.dataType as SemanticDataType,
    }))
}

/**
 * Generate WorkflowVariable[] for a given trigger type.
 * Fields come from the entity-fields registry — single source of truth.
 */
export function getVariablesForTrigger(triggerType: TriggerType): WorkflowVariable[] {
  const definition = TRIGGER_POOLS[triggerType]
  if (!definition) return []

  return definition.pools.map((pool) => {
    const fields: WorkflowVariableField[] = []

    if (pool.deriveFieldsFromEntity) {
      fields.push(...entityFieldsToVariableFields(pool.deriveFieldsFromEntity))
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
