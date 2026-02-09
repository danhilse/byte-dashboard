import { Badge } from "@/components/ui/badge"
import {
  contactStatusConfig,
  taskStatusConfig,
  taskPriorityConfig,
  resolveWorkflowStatusDisplay,
} from "@/lib/status-config"
import type { ContactStatus, TaskStatus, TaskPriority, DefinitionStatus } from "@/types"

interface ContactStatusBadgeProps {
  status: ContactStatus
}

export function ContactStatusBadge({ status }: ContactStatusBadgeProps) {
  const config = contactStatusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

interface WorkflowStatusBadgeProps {
  status: string
  definitionStatuses?: DefinitionStatus[]
}

export function WorkflowStatusBadge({ status, definitionStatuses }: WorkflowStatusBadgeProps) {
  const config = resolveWorkflowStatusDisplay(status, definitionStatuses)
  return (
    <Badge variant={config.variant}>
      {config.color && (
        <span
          className="mr-1.5 inline-block size-2 rounded-full"
          style={{ backgroundColor: config.color }}
        />
      )}
      {config.label}
    </Badge>
  )
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
