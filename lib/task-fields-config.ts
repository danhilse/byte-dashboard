// ============================================================================
// Task Fields Configuration
// ============================================================================

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

export const taskFieldConfig: Record<TaskField, { label: string; description?: string }> = {
  title: {
    label: "Title",
    description: "Task title",
  },
  description: {
    label: "Description",
    description: "Task description or notes",
  },
  status: {
    label: "Status",
    description: "Task status (todo, in_progress, completed)",
  },
  priority: {
    label: "Priority",
    description: "Task priority level",
  },
  assignedTo: {
    label: "Assigned To",
    description: "User or role assigned to this task",
  },
  dueDate: {
    label: "Due Date",
    description: "Task due date",
  },
}

export const taskFieldOptions = allTaskFields.map((field) => ({
  value: field,
  label: taskFieldConfig[field].label,
}))
