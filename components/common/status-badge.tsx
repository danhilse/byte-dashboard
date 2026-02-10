import { Badge } from "@/components/ui/badge"
import {
  contactStatusConfig,
  taskStatusConfig,
  taskPriorityConfig,
  resolveWorkflowStatusDisplay,
  workflowExecutionStateConfig,
} from "@/lib/status-config"
import { getTaskStatusDisplay } from "@/lib/tasks/presentation"
import type {
  ContactStatus,
  TaskStatus,
  TaskPriority,
  TaskType,
  TaskOutcome,
  DefinitionStatus,
  WorkflowExecutionState,
} from "@/types"

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

interface WorkflowExecutionStateBadgeProps {
  state: WorkflowExecutionState
}

export function WorkflowExecutionStateBadge({
  state,
}: WorkflowExecutionStateBadgeProps) {
  const config = workflowExecutionStateConfig[state]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

interface TaskStatusBadgeProps {
  status: TaskStatus
  taskType?: TaskType
  outcome?: TaskOutcome
}

export function TaskStatusBadge({ status, taskType, outcome }: TaskStatusBadgeProps) {
  const fallback = taskStatusConfig[status]
  const display = getTaskStatusDisplay(
    {
      taskType: taskType ?? "standard",
      status,
      outcome: outcome ?? null,
    },
    fallback
  )

  return <Badge variant={display.variant}>{display.label}</Badge>
}

interface TaskPriorityBadgeProps {
  priority: TaskPriority
}

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  const config = taskPriorityConfig[priority]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
