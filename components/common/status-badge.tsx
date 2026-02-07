import { Badge } from "@/components/ui/badge"
import {
  contactStatusConfig,
  workflowStatusConfig,
  taskStatusConfig,
  taskPriorityConfig,
} from "@/lib/status-config"
import type { ContactStatus, WorkflowStatus, TaskStatus, TaskPriority } from "@/types"

interface ContactStatusBadgeProps {
  status: ContactStatus
}

export function ContactStatusBadge({ status }: ContactStatusBadgeProps) {
  const config = contactStatusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

interface WorkflowStatusBadgeProps {
  status: WorkflowStatus
}

export function WorkflowStatusBadge({ status }: WorkflowStatusBadgeProps) {
  const config = workflowStatusConfig[status]
  if (!config) return <Badge variant="outline">{status}</Badge>
  return <Badge variant={config.variant}>{config.label}</Badge>
}

interface TaskStatusBadgeProps {
  status: TaskStatus
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = taskStatusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

interface TaskPriorityBadgeProps {
  priority: TaskPriority
}

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  const config = taskPriorityConfig[priority]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
