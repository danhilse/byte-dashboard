"use client"

import type { WorkflowAction, WorkflowVariable, WorkflowStatus } from "../../types/workflow-v2"
import { getActionMetadata } from "@/lib/workflow-builder-v2/action-registry"
import { resolveDisplayValue } from "@/lib/workflow-builder-v2/variable-utils"
import { roleConfig } from "@/lib/roles-config"
import type { Role } from "@/lib/roles-config"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Copy, Trash2 } from "lucide-react"
import { ConfirmAction } from "../confirm-action"
import { SendEmailConfig } from "./action-config/send-email-config"
import { CreateTaskConfig } from "./action-config/create-task-config"
import { UpdateContactConfig } from "./action-config/update-contact-config"
import { UpdateStatusConfig } from "./action-config/update-status-config"
import { UpdateTaskConfig } from "./action-config/update-task-config"
import { CreateContactConfig } from "./action-config/create-contact-config"
import { SetVariableConfig } from "./action-config/set-variable-config"
import { NotificationConfig } from "./action-config/notification-config"
import type { OrganizationUserOption } from "../organization-user-option"

interface ActionCardProps {
  action: WorkflowAction
  variables: WorkflowVariable[]
  statuses: WorkflowStatus[]
  organizationUsers: OrganizationUserOption[]
  organizationUsersLoading: boolean
  allowedFromEmails: string[]
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (action: WorkflowAction) => void
  onDuplicate: () => void
  onDelete: () => void
  onAddVariable?: (variable: WorkflowVariable) => void
}

export function ActionCard({
  action,
  variables,
  statuses,
  organizationUsers,
  organizationUsersLoading,
  allowedFromEmails,
  isExpanded,
  onToggle,
  onUpdate,
  onDuplicate,
  onDelete,
  onAddVariable,
}: ActionCardProps) {
  const metadata = getActionMetadata(action.type)
  const Icon = metadata.icon

  const formatUserLabel = (user: OrganizationUserOption) => {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
    return fullName || user.email
  }

  const getUserLabel = (userId: string, fallback = "(not set)") => {
    if (!userId) return fallback
    const matchedUser = organizationUsers.find((user) => user.id === userId)
    return matchedUser ? formatUserLabel(matchedUser) : userId
  }

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
          : `User: ${getUserLabel(action.config.assignTo.userId)}`
        const linksCount = action.config.links?.filter((link) => link.trim().length > 0).length ?? 0
        const linksSuffix = linksCount > 0 ? `, ${linksCount} link${linksCount === 1 ? "" : "s"}` : ""
        return `"${title}" → ${assignLabel}${linksSuffix}`
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
      case "notification": {
        const targetLabel =
          action.config.recipients.type === "organization"
            ? "All organization users"
            : action.config.recipients.type === "role"
              ? `Role: ${roleConfig[action.config.recipients.role as Role]?.label || action.config.recipients.role || "(none)"}`
              : action.config.recipients.type === "group"
                ? `${action.config.recipients.groupIds.length} group${action.config.recipients.groupIds.length === 1 ? "" : "s"}`
                : `User: ${getUserLabel(action.config.recipients.userId)}`

        return `${targetLabel}, Title: ${action.config.title || "(no title)"}`
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
            onDuplicate()
          }}
          title="Duplicate action"
        >
          <Copy className="size-3.5" />
        </Button>
        <ConfirmAction
          title={`Delete this ${metadata.label.toLowerCase()} action?`}
          description="This action will be removed from the step configuration."
          confirmLabel="Delete Action"
          onConfirm={onDelete}
        >
          <Button
            variant="ghost"
            size="sm"
            className="size-7 p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </ConfirmAction>
      </div>

      {/* Expanded Config */}
      {isExpanded && (
        <div className="border-t p-4">
          {action.type === "send_email" && (
            <SendEmailConfig
              action={action}
              variables={variables}
              allowedFromEmails={allowedFromEmails}
              onChange={onUpdate}
            />
          )}
          {action.type === "create_task" && (
            <CreateTaskConfig
              action={action}
              variables={variables}
              organizationUsers={organizationUsers}
              organizationUsersLoading={organizationUsersLoading}
              onChange={onUpdate}
            />
          )}
          {action.type === "update_contact" && (
            <UpdateContactConfig action={action} onChange={onUpdate} />
          )}
          {action.type === "update_status" && (
            <UpdateStatusConfig action={action} statuses={statuses} onChange={onUpdate} />
          )}
          {action.type === "update_task" && (
            <UpdateTaskConfig action={action} variables={variables} statuses={statuses} onChange={onUpdate} />
          )}
          {action.type === "create_contact" && (
            <CreateContactConfig action={action} onChange={onUpdate} />
          )}
          {action.type === "set_variable" && (
            <SetVariableConfig action={action} variables={variables} onChange={onUpdate} onAddVariable={onAddVariable} />
          )}
          {action.type === "notification" && (
            <NotificationConfig
              action={action}
              variables={variables}
              organizationUsers={organizationUsers}
              organizationUsersLoading={organizationUsersLoading}
              onChange={onUpdate}
            />
          )}
        </div>
      )}
    </div>
  )
}
