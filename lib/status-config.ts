import type { ContactStatus, WorkflowStatus, TaskStatus, TaskPriority } from "@/types"

type BadgeVariant = "default" | "secondary" | "outline" | "destructive"

// Contact status configuration
export const allContactStatuses: readonly ContactStatus[] = ["active", "inactive", "lead"]
export const contactStatusConfig: Record<ContactStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: "Active", variant: "default" },
  inactive: { label: "Inactive", variant: "secondary" },
  lead: { label: "Lead", variant: "outline" },
}

// Workflow status configuration
export const allWorkflowStatuses: readonly WorkflowStatus[] = ["draft", "in_review", "pending", "on_hold", "approved", "rejected", "running", "completed", "failed", "timeout"]
export const workflowStatusConfig: Record<WorkflowStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "outline" },
  in_review: { label: "In Review", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  on_hold: { label: "On Hold", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  running: { label: "Running", variant: "default" },
  completed: { label: "Completed", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
  timeout: { label: "Timed Out", variant: "destructive" },
}

// Application status configuration (legacy alias)
export const applicationStatusConfig: Record<WorkflowStatus, { label: string; variant: BadgeVariant }> = workflowStatusConfig

// Task status configuration
export const allTaskStatuses: readonly TaskStatus[] = ["backlog", "todo", "in_progress", "done"]
export const taskStatusConfig: Record<TaskStatus, { label: string; variant: BadgeVariant }> = {
  backlog: { label: "Backlog", variant: "outline" },
  todo: { label: "To Do", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  done: { label: "Done", variant: "default" },
}

// Task priority configuration
export const taskPriorityConfig: Record<TaskPriority, { label: string; variant: BadgeVariant }> = {
  low: { label: "Low", variant: "outline" },
  medium: { label: "Medium", variant: "secondary" },
  high: { label: "High", variant: "default" },
  urgent: { label: "Urgent", variant: "destructive" },
}

// Filter options for data tables
export const contactStatusOptions = Object.entries(contactStatusConfig).map(([value, { label }]) => ({
  label,
  value,
}))

export const workflowStatusOptions = Object.entries(workflowStatusConfig).map(([value, { label }]) => ({
  label,
  value,
}))

export const applicationStatusOptions = workflowStatusOptions

export const taskStatusOptions = Object.entries(taskStatusConfig).map(([value, { label }]) => ({
  label,
  value,
}))
