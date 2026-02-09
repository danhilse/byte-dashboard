"use client"

import type { WorkflowAction, WorkflowVariable, WorkflowStatus } from "../../types/workflow-v2"
import { getActionMetadata } from "@/lib/workflow-builder-v2/action-registry"
import { resolveDisplayValue } from "@/lib/workflow-builder-v2/variable-utils"
import { roleConfig } from "@/lib/roles-config"
import type { Role } from "@/lib/roles-config"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { SendEmailConfig } from "./action-config/send-email-config"
import { CreateTaskConfig } from "./action-config/create-task-config"
import { UpdateContactConfig } from "./action-config/update-contact-config"
import { UpdateStatusConfig } from "./action-config/update-status-config"
import { UpdateTaskConfig } from "./action-config/update-task-config"
import { CreateContactConfig } from "./action-config/create-contact-config"
import { SetVariableConfig } from "./action-config/set-variable-config"

interface ActionCardProps {
  action: WorkflowAction
  variables: WorkflowVariable[]
  statuses: WorkflowStatus[]
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (action: WorkflowAction) => void
  onDelete: () => void
  onAddVariable?: (variable: WorkflowVariable) => void
}

export function ActionCard({
  action,
  variables,
  statuses,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  onAddVariable,
}: ActionCardProps) {
  const metadata = getActionMetadata(action.type)
  const Icon = metadata.icon

  // Generate summary line for collapsed state
  const getSummary = () => {
    switch (action.type) {
      case "send_email": {
        const to = resolveDisplayValue(action.config.to, variables, "(no recipient)")
        return `To: ${to}, Subject: ${action.config.subject || "(no subject)"}`
      }
      case "create_task": {
        const title = action.config.title || "(untitled)"
        const assignLabel = action.config.assignTo.type === "role"
          ? `Role: ${roleConfig[action.config.assignTo.role as Role]?.label || action.config.assignTo.role || "(none)"}`
          : "User"
        return `"${title}" → ${assignLabel}`
      }
      case "update_contact":
        return `${action.config.fields.length} field${action.config.fields.length === 1 ? "" : "s"}`
      case "update_status": {
        const statusLabel = statuses.find((s) => s.id === action.config.status)?.label || action.config.status || "(not set)"
        return `Status → ${statusLabel}`
      }
      case "update_task": {
        const taskVar = variables.find(
          (v) => v.type === "task" && v.source.type === "action_output" && v.source.actionId === action.config.taskActionId
        )
        return `Update ${taskVar?.name || "task"}`
      }
      case "create_contact":
        return `Type: ${action.config.contactType}, ${action.config.fields.length} field${action.config.fields.length === 1 ? "" : "s"}`
      case "set_variable": {
        const varName = variables.find((v) => v.id === action.config.variableId)?.name || "(variable)"
        const valueLabel = resolveDisplayValue(action.config.value, variables, "(not set)")
        return `${varName} = ${valueLabel}`
      }
      default:
        return ""
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {isExpanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
          <Icon className="size-4" />
          <div className="flex-1">
            <div className="font-medium">{metadata.label}</div>
            {!isExpanded && getSummary() && (
              <div className="text-xs text-muted-foreground">{getSummary()}</div>
            )}
          </div>
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="size-7 p-0"
          onClick={(e) => {
            e.stopPropagation()
            if (confirm(`Delete this ${metadata.label.toLowerCase()} action?`)) {
              onDelete()
            }
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* Expanded Config */}
      {isExpanded && (
        <div className="border-t p-4">
          {action.type === "send_email" && (
            <SendEmailConfig action={action} variables={variables} onChange={onUpdate} />
          )}
          {action.type === "create_task" && (
            <CreateTaskConfig action={action} variables={variables} onChange={onUpdate} />
          )}
          {action.type === "update_contact" && (
            <UpdateContactConfig action={action} variables={variables} onChange={onUpdate} />
          )}
          {action.type === "update_status" && (
            <UpdateStatusConfig action={action} variables={variables} statuses={statuses} onChange={onUpdate} />
          )}
          {action.type === "update_task" && (
            <UpdateTaskConfig action={action} variables={variables} statuses={statuses} onChange={onUpdate} />
          )}
          {action.type === "create_contact" && (
            <CreateContactConfig action={action} variables={variables} onChange={onUpdate} />
          )}
          {action.type === "set_variable" && (
            <SetVariableConfig action={action} variables={variables} onChange={onUpdate} onAddVariable={onAddVariable} />
          )}
        </div>
      )}
    </div>
  )
}
