import type { ContactStatus, TaskStatus, TaskPriority, DefinitionStatus } from "@/types"

type BadgeVariant = "default" | "secondary" | "outline" | "destructive"

// Contact status configuration
export const allContactStatuses: readonly ContactStatus[] = ["active", "inactive", "lead"]
export const contactStatusConfig: Record<ContactStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: "Active", variant: "default" },
  inactive: { label: "Inactive", variant: "secondary" },
  lead: { label: "Lead", variant: "outline" },
}

// Workflow status configuration — fallback for workflows without definition statuses
export const fallbackWorkflowStatusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
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

/** @deprecated Use fallbackWorkflowStatusConfig or resolveWorkflowStatusDisplay instead */
export const workflowStatusConfig = fallbackWorkflowStatusConfig

export const fallbackWorkflowStatuses: readonly string[] = ["draft", "in_review", "pending", "on_hold", "approved", "rejected", "running", "completed", "failed", "timeout"]

/** @deprecated Use fallbackWorkflowStatuses instead */
export const allWorkflowStatuses = fallbackWorkflowStatuses

/**
 * Resolve display info for a workflow status.
 * Checks definition statuses first, falls back to hardcoded config.
 */
export function resolveWorkflowStatusDisplay(
  statusId: string,
  definitionStatuses?: DefinitionStatus[]
): { label: string; variant: BadgeVariant; color?: string } {
  if (definitionStatuses?.length) {
    const defStatus = definitionStatuses.find((s) => s.id === statusId)
    if (defStatus) {
      return { label: defStatus.label, variant: "default", color: defStatus.color }
    }
  }
  const fallback = fallbackWorkflowStatusConfig[statusId]
  if (fallback) {
    return fallback
  }
  return { label: statusId, variant: "outline" }
}

/**
 * Build filter options from definition statuses.
 */
export function definitionStatusOptions(statuses: DefinitionStatus[]): { label: string; value: string }[] {
  return [...statuses]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ label: s.label, value: s.id }))
}

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

export const workflowStatusOptions = Object.entries(fallbackWorkflowStatusConfig).map(([value, { label }]) => ({
  label,
  value,
}))

/** @deprecated Use workflowStatusOptions or definitionStatusOptions instead */
export const fallbackWorkflowStatusOptions = workflowStatusOptions

export const taskStatusOptions = Object.entries(taskStatusConfig).map(([value, { label }]) => ({
  label,
  value,
}))
