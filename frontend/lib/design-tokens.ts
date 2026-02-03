import type { TaskPriority, Activity } from "@/types"

/**
 * Centralized design tokens for consistent styling across the application.
 * These map semantic meanings to Tailwind classes using CSS variables defined in globals.css.
 *
 * Usage:
 *   import { priorityColors, activityColors, trendColors } from "@/lib/design-tokens"
 *   <div className={priorityColors.background[task.priority]} />
 */

// Priority level colors (for task/application priority indicators)
export const priorityColors = {
  background: {
    low: "bg-priority-low",
    medium: "bg-priority-medium",
    high: "bg-priority-high",
    urgent: "bg-priority-urgent",
  },
  text: {
    low: "text-priority-low",
    medium: "text-priority-medium",
    high: "text-priority-high",
    urgent: "text-priority-urgent",
  },
} as const satisfies Record<string, Record<TaskPriority, string>>

// Activity type colors (for activity feed icons)
export const activityColors = {
  contact_created: "text-activity-contact",
  application_submitted: "text-activity-application",
  task_completed: "text-activity-task",
  note_added: "text-activity-note",
  status_changed: "text-activity-status",
} as const satisfies Record<Activity["type"], string>

// Trend indicator colors (for stats showing increase/decrease)
export const trendColors = {
  positive: "text-trend-positive",
  negative: "text-trend-negative",
} as const

// Status indicator colors (generic status feedback)
export const statusColors = {
  background: {
    info: "bg-status-info",
    success: "bg-status-success",
    warning: "bg-status-warning",
    error: "bg-status-error",
  },
  text: {
    info: "text-status-info",
    success: "text-status-success",
    warning: "text-status-warning",
    error: "text-status-error",
  },
} as const
