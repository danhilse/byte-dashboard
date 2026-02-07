import { Badge } from "@/components/ui/badge"
import {
  contactStatusConfig,
  workflowStatusConfig,
  applicationStatusConfig,
  taskStatusConfig,
  taskPriorityConfig,
  workflowPriorityConfig,
  applicationPriorityConfig,
} from "@/lib/status-config"
import type { ContactStatus, WorkflowStatus, TaskStatus, TaskPriority, Workflow } from "@/types"

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

/** @deprecated Use WorkflowStatusBadge instead */
export function ApplicationStatusBadge({ status }: WorkflowStatusBadgeProps) {
  return <WorkflowStatusBadge status={status} />
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

interface ApplicationPriorityBadgeProps {
  priority: NonNullable<Workflow["priority"]>
}

/** @deprecated Use workflow-specific priority badge instead */
export function ApplicationPriorityBadge({ priority }: ApplicationPriorityBadgeProps) {
  const config = applicationPriorityConfig[priority]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
