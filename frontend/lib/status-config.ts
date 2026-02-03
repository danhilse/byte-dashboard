import type { ContactStatus, ApplicationStatus, TaskStatus, TaskPriority, Application } from "@/types"

type BadgeVariant = "default" | "secondary" | "outline" | "destructive"

// Contact status configuration
export const contactStatusConfig: Record<ContactStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: "Active", variant: "default" },
  inactive: { label: "Inactive", variant: "secondary" },
  lead: { label: "Lead", variant: "outline" },
}

// Application status configuration
export const applicationStatusConfig: Record<ApplicationStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "outline" },
  submitted: { label: "Submitted", variant: "secondary" },
  under_review: { label: "Under Review", variant: "default" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
}

// Task status configuration
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

// Application priority configuration (subset of task priority)
export const applicationPriorityConfig: Record<Application["priority"], { label: string; variant: BadgeVariant }> = {
  low: { label: "Low", variant: "outline" },
  medium: { label: "Medium", variant: "secondary" },
  high: { label: "High", variant: "destructive" },
}

// Filter options for data tables
export const contactStatusOptions = Object.entries(contactStatusConfig).map(([value, { label }]) => ({
  label,
  value,
}))

export const applicationStatusOptions = Object.entries(applicationStatusConfig).map(([value, { label }]) => ({
  label,
  value,
}))

export const taskStatusOptions = Object.entries(taskStatusConfig).map(([value, { label }]) => ({
  label,
  value,
}))
