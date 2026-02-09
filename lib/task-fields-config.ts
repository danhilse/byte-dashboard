// ============================================================================
// Task Fields Configuration
// ============================================================================

import type { FieldInputType } from "./field-input-types"

export type TaskField =
  | "title"
  | "description"
  | "status"
  | "priority"
  | "assignedTo"
  | "dueDate"

export const allTaskFields: readonly TaskField[] = [
  "title",
  "description",
  "status",
  "priority",
  "assignedTo",
  "dueDate",
]

export const taskFieldConfig: Record<TaskField, { label: string; description?: string; inputType: FieldInputType }> = {
  title: {
    label: "Title",
    description: "Task title",
    inputType: "text",
  },
  description: {
    label: "Description",
    description: "Task description or notes",
    inputType: "textarea",
  },
  status: {
    label: "Status",
    description: "Task status (todo, in_progress, completed)",
    inputType: "status",
  },
  priority: {
    label: "Priority",
    description: "Task priority level",
    inputType: "priority",
  },
  assignedTo: {
    label: "Assigned To",
    description: "User or role assigned to this task",
    inputType: "role",
  },
  dueDate: {
    label: "Due Date",
    description: "Task due date",
    inputType: "days_after",
  },
}

export const taskFieldOptions = allTaskFields.map((field) => ({
  value: field,
  label: taskFieldConfig[field].label,
}))
