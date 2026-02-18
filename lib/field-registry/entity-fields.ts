// ============================================================================
// Layer 2: Entity Field Definitions — single source of truth, DB-aligned
// ============================================================================

import type { FieldInputType } from "@/lib/field-input-types"
import type { SemanticDataType } from "./data-types"

export type EntityType = "contact" | "task" | "user"

export interface EntityFieldDefinition {
  key: string
  label: string
  description?: string
  dataType: SemanticDataType
  inputType: FieldInputType
  entity: EntityType
  isRequired?: boolean
  isReadOnly?: boolean
  /** Can trigger contact_field_changed */
  isWatchable?: boolean
  /** Runtime update_contact / update_task accepts this field */
  isRuntimeWritable?: boolean
  enumValues?: readonly string[]
}

// ============================================================================
// Contact Fields — aligned with DB schema (schema.ts contacts table)
// ============================================================================
// DB columns: firstName, lastName, email, phone, company, role, status,
//             avatarUrl, lastContactedAt, addressLine1, addressLine2,
//             city, state, zip, metadata, tags

const CONTACT_FIELDS: readonly EntityFieldDefinition[] = [
  {
    key: "email",
    label: "Email",
    description: "Contact's email address",
    dataType: "email",
    inputType: "email",
    entity: "contact",
    isWatchable: true,
    isRuntimeWritable: true,
  },
  {
    key: "firstName",
    label: "First Name",
    description: "Contact's first name",
    dataType: "name",
    inputType: "text",
    entity: "contact",
    isRequired: true,
    isWatchable: true,
    isRuntimeWritable: true,
  },
  {
    key: "lastName",
    label: "Last Name",
    description: "Contact's last name",
    dataType: "name",
    inputType: "text",
    entity: "contact",
    isRequired: true,
    isWatchable: true,
    isRuntimeWritable: true,
  },
  {
    key: "phone",
    label: "Phone",
    description: "Contact's phone number",
    dataType: "phone",
    inputType: "tel",
    entity: "contact",
    isWatchable: true,
    isRuntimeWritable: true,
  },
  {
    key: "company",
    label: "Company",
    description: "Company name",
    dataType: "text",
    inputType: "text",
    entity: "contact",
    isWatchable: true,
    // Not in updateContact() accepted fields
    isRuntimeWritable: false,
  },
  {
    key: "role",
    label: "Role",
    description: "Contact's role",
    dataType: "text",
    inputType: "text",
    entity: "contact",
    isWatchable: true,
    isRuntimeWritable: false,
  },
  {
    key: "status",
    label: "Status",
    description: "Contact status (active, inactive, lead)",
    dataType: "contact_status",
    inputType: "contact_status",
    entity: "contact",
    isWatchable: true,
    isRuntimeWritable: false,
    enumValues: ["active", "inactive", "lead"] as const,
  },
  {
    key: "addressLine1",
    label: "Address Line 1",
    description: "Street address",
    dataType: "text",
    inputType: "text",
    entity: "contact",
    isWatchable: true,
    isRuntimeWritable: true,
  },
  {
    key: "addressLine2",
    label: "Address Line 2",
    description: "Suite, unit, etc.",
    dataType: "text",
    inputType: "text",
    entity: "contact",
    isWatchable: true,
    isRuntimeWritable: true,
  },
  {
    key: "city",
    label: "City",
    description: "City name",
    dataType: "text",
    inputType: "text",
    entity: "contact",
    isWatchable: true,
    isRuntimeWritable: true,
  },
  {
    key: "state",
    label: "State/Province",
    description: "State or province",
    dataType: "text",
    inputType: "text",
    entity: "contact",
    isWatchable: true,
    isRuntimeWritable: true,
  },
  {
    key: "zip",
    label: "ZIP/Postal Code",
    description: "ZIP or postal code",
    dataType: "text",
    inputType: "text",
    entity: "contact",
    isWatchable: true,
    isRuntimeWritable: true,
  },
  {
    key: "tags",
    label: "Tags",
    description: "Contact tags",
    dataType: "tags",
    inputType: "text",
    entity: "contact",
    isWatchable: true,
    isRuntimeWritable: true,
  },
] as const

// ============================================================================
// Task Fields — aligned with DB schema + runtime validation
// ============================================================================
// ALLOWED_UPDATE_TASK_FIELDS (generic-workflow.ts:95):
//   status, priority, description, assignedRole, assignedTo
// Runtime validates:
//   status: backlog, todo, in_progress, done
//   priority: low, medium, high, urgent

const TASK_FIELDS: readonly EntityFieldDefinition[] = [
  {
    key: "title",
    label: "Title",
    description: "Task title",
    dataType: "text",
    inputType: "text",
    entity: "task",
    isRequired: true,
    isRuntimeWritable: false,
  },
  {
    key: "description",
    label: "Description",
    description: "Task description or notes",
    dataType: "textarea",
    inputType: "textarea",
    entity: "task",
    isRuntimeWritable: true,
  },
  {
    key: "status",
    label: "Status",
    description: "Task status (backlog, todo, in_progress, done)",
    dataType: "task_status",
    inputType: "task_status",
    entity: "task",
    isRuntimeWritable: true,
    enumValues: ["backlog", "todo", "in_progress", "done"] as const,
  },
  {
    key: "priority",
    label: "Priority",
    description: "Task priority level",
    dataType: "task_priority",
    inputType: "priority",
    entity: "task",
    isRuntimeWritable: true,
    enumValues: ["low", "medium", "high", "urgent"] as const,
  },
  {
    key: "assignedTo",
    label: "Assigned To",
    description: "Specific user assigned to this task",
    dataType: "user",
    inputType: "text",
    entity: "task",
    isRuntimeWritable: true,
  },
  {
    key: "assignedRole",
    label: "Assigned Role",
    description: "Role assigned to this task",
    dataType: "role",
    inputType: "role",
    entity: "task",
    isRuntimeWritable: true,
  },
  {
    key: "dueDate",
    label: "Due Date",
    description: "Task due date",
    dataType: "date",
    inputType: "days_after",
    entity: "task",
    isRuntimeWritable: false,
  },
  {
    key: "outcome",
    label: "Outcome",
    description: "Task outcome (for approval tasks)",
    dataType: "text",
    inputType: "text",
    entity: "task",
    isReadOnly: true,
    isRuntimeWritable: false,
  },
  {
    key: "completedAt",
    label: "Completed At",
    description: "When the task was completed",
    dataType: "datetime",
    inputType: "text",
    entity: "task",
    isReadOnly: true,
    isRuntimeWritable: false,
  },
] as const

// ============================================================================
// User Fields — all read-only
// ============================================================================

const USER_FIELDS: readonly EntityFieldDefinition[] = [
  {
    key: "id",
    label: "User ID",
    description: "Unique user identifier",
    dataType: "user",
    inputType: "text",
    entity: "user",
    isReadOnly: true,
    isRuntimeWritable: false,
  },
  {
    key: "name",
    label: "Name",
    description: "User's display name",
    dataType: "name",
    inputType: "text",
    entity: "user",
    isReadOnly: true,
    isRuntimeWritable: false,
  },
  {
    key: "email",
    label: "Email",
    description: "User's email address",
    dataType: "email",
    inputType: "email",
    entity: "user",
    isReadOnly: true,
    isRuntimeWritable: false,
  },
  {
    key: "role",
    label: "Role",
    description: "User's role",
    dataType: "role",
    inputType: "role",
    entity: "user",
    isReadOnly: true,
    isRuntimeWritable: false,
  },
] as const

// ============================================================================
// Registry
// ============================================================================

const ENTITY_FIELDS_MAP: Record<EntityType, readonly EntityFieldDefinition[]> = {
  contact: CONTACT_FIELDS,
  task: TASK_FIELDS,
  user: USER_FIELDS,
}

/** Get all field definitions for an entity type. */
export function getFieldsForEntity(entity: EntityType): readonly EntityFieldDefinition[] {
  return ENTITY_FIELDS_MAP[entity]
}

/** Get a single field definition by entity + key. */
export function getFieldDefinition(
  entity: EntityType,
  key: string
): EntityFieldDefinition | undefined {
  return ENTITY_FIELDS_MAP[entity].find((f) => f.key === key)
}

/** Get fields that can trigger contact_field_changed. */
export function getWatchableFields(entity: EntityType): readonly EntityFieldDefinition[] {
  return ENTITY_FIELDS_MAP[entity].filter((f) => f.isWatchable)
}

/** Get fields that the runtime can write (for action configs). */
export function getRuntimeWritableFields(entity: EntityType): readonly EntityFieldDefinition[] {
  return ENTITY_FIELDS_MAP[entity].filter((f) => f.isRuntimeWritable)
}

/** Get fields matching a specific data type. */
export function getFieldsByDataType(
  entity: EntityType,
  dataType: SemanticDataType
): readonly EntityFieldDefinition[] {
  return ENTITY_FIELDS_MAP[entity].filter((f) => f.dataType === dataType)
}
