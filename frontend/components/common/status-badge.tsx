import { Badge } from "@/components/ui/badge"
import {
  contactStatusConfig,
  applicationStatusConfig,
  taskStatusConfig,
  taskPriorityConfig,
  applicationPriorityConfig,
} from "@/lib/status-config"
import type { ContactStatus, ApplicationStatus, TaskStatus, TaskPriority, Application } from "@/types"

interface ContactStatusBadgeProps {
  status: ContactStatus
}

export function ContactStatusBadge({ status }: ContactStatusBadgeProps) {
  const config = contactStatusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus
}

export function ApplicationStatusBadge({ status }: ApplicationStatusBadgeProps) {
  const config = applicationStatusConfig[status]
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

interface ApplicationPriorityBadgeProps {
  priority: Application["priority"]
}

export function ApplicationPriorityBadge({ priority }: ApplicationPriorityBadgeProps) {
  const config = applicationPriorityConfig[priority]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
