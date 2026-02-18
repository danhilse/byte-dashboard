// ============================================================================
// Layer 1: Semantic Data Types — taxonomy + directional compatibility
// ============================================================================

import type { FieldInputType } from "@/lib/field-input-types"

/**
 * Semantic data type taxonomy for fields and variables.
 * Each type carries meaning beyond its raw format, enabling
 * smart filtering (e.g. an email variable should only fill an email field).
 */
export type SemanticDataType =
  | "text"
  | "textarea"
  | "name"
  | "email"
  | "phone"
  | "url"
  | "number"
  | "date"
  | "datetime"
  | "boolean"
  | "duration"
  | "user"
  | "role"
  | "contact_ref"
  | "contact_status"
  | "task_status"
  | "task_priority"
  | "workflow_status"
  | "tags"

export type DataTypeCategory = "text" | "numeric" | "temporal" | "identity" | "enum" | "collection"

export interface DataTypeMetadata {
  label: string
  category: DataTypeCategory
  inputType: FieldInputType
  /** Source types that can satisfy this type when used as a target requirement. */
  compatibleAsTargetFor: readonly SemanticDataType[]
}

/**
 * Registry of metadata for each semantic data type.
 *
 * `compatibleAsTargetFor` answers: "if I require THIS type, which source types can fill it?"
 * - `text` is the broadest text type — accepts name, email, phone, url, text
 * - `email` is strict — only email sources
 * - `datetime` is compatible as `date` target (safe truncation)
 */
export const DATA_TYPE_METADATA: Record<SemanticDataType, DataTypeMetadata> = {
  text: {
    label: "Text",
    category: "text",
    inputType: "text",
    compatibleAsTargetFor: ["text", "name", "email", "phone", "url"],
  },
  textarea: {
    label: "Long Text",
    category: "text",
    inputType: "textarea",
    compatibleAsTargetFor: ["textarea", "text", "name", "email", "phone", "url"],
  },
  name: {
    label: "Name",
    category: "text",
    inputType: "text",
    compatibleAsTargetFor: ["name", "text"],
  },
  email: {
    label: "Email",
    category: "text",
    inputType: "email",
    compatibleAsTargetFor: ["email"],
  },
  phone: {
    label: "Phone",
    category: "text",
    inputType: "tel",
    compatibleAsTargetFor: ["phone"],
  },
  url: {
    label: "URL",
    category: "text",
    inputType: "text",
    compatibleAsTargetFor: ["url"],
  },
  number: {
    label: "Number",
    category: "numeric",
    inputType: "text",
    compatibleAsTargetFor: ["number"],
  },
  date: {
    label: "Date",
    category: "temporal",
    inputType: "text",
    compatibleAsTargetFor: ["date", "datetime"],
  },
  datetime: {
    label: "Date & Time",
    category: "temporal",
    inputType: "text",
    compatibleAsTargetFor: ["datetime"],
  },
  boolean: {
    label: "Boolean",
    category: "numeric",
    inputType: "text",
    compatibleAsTargetFor: ["boolean"],
  },
  duration: {
    label: "Duration",
    category: "numeric",
    inputType: "days_after",
    compatibleAsTargetFor: ["duration"],
  },
  user: {
    label: "User",
    category: "identity",
    inputType: "text",
    compatibleAsTargetFor: ["user"],
  },
  role: {
    label: "Role",
    category: "identity",
    inputType: "role",
    compatibleAsTargetFor: ["role"],
  },
  contact_ref: {
    label: "Contact Reference",
    category: "identity",
    inputType: "text",
    compatibleAsTargetFor: ["contact_ref"],
  },
  contact_status: {
    label: "Contact Status",
    category: "enum",
    inputType: "contact_status",
    compatibleAsTargetFor: ["contact_status"],
  },
  task_status: {
    label: "Task Status",
    category: "enum",
    inputType: "task_status",
    compatibleAsTargetFor: ["task_status"],
  },
  task_priority: {
    label: "Task Priority",
    category: "enum",
    inputType: "priority",
    compatibleAsTargetFor: ["task_priority"],
  },
  workflow_status: {
    label: "Workflow Status",
    category: "enum",
    inputType: "status",
    compatibleAsTargetFor: ["workflow_status"],
  },
  tags: {
    label: "Tags",
    category: "collection",
    inputType: "text",
    compatibleAsTargetFor: ["tags"],
  },
}

/**
 * Directional compatibility check.
 * "Can a value of `source` type be used where `target` type is required?"
 *
 * Examples:
 * - isDataTypeCompatible("email", "text") → true  (email can be used as text)
 * - isDataTypeCompatible("text", "email") → false  (text cannot be used as email)
 * - isDataTypeCompatible("datetime", "date") → true (datetime truncates to date)
 * - isDataTypeCompatible("date", "datetime") → false
 */
export function isDataTypeCompatible(
  source: SemanticDataType,
  target: SemanticDataType
): boolean {
  if (source === target) return true
  const meta = DATA_TYPE_METADATA[target]
  return meta.compatibleAsTargetFor.includes(source)
}

/** Get metadata for a data type. */
export function getDataTypeMetadata(dataType: SemanticDataType): DataTypeMetadata {
  return DATA_TYPE_METADATA[dataType]
}

/** All semantic data types as an array. */
export const ALL_SEMANTIC_DATA_TYPES: readonly SemanticDataType[] = Object.keys(
  DATA_TYPE_METADATA
) as SemanticDataType[]
