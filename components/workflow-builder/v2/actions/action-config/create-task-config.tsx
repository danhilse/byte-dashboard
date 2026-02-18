"use client"

import type { WorkflowAction, WorkflowVariable } from "../../../types/workflow-v2"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { allRoles, roleConfig } from "@/lib/roles-config"
import { taskPriorityConfig } from "@/lib/status-config"
import { getFieldDefinition } from "@/lib/field-registry"
import type { OrganizationUserOption } from "../../organization-user-option"
import { TemplatedTextInput } from "../../templated-text-input"
import { Plus, Trash2 } from "lucide-react"

interface CreateTaskConfigProps {
  action: Extract<WorkflowAction, { type: "create_task" }>
  variables: WorkflowVariable[]
  organizationUsers: OrganizationUserOption[]
  organizationUsersLoading: boolean
  onChange: (action: WorkflowAction) => void
}

export function CreateTaskConfig({
  action,
  variables,
  organizationUsers,
  organizationUsersLoading,
  onChange,
}: CreateTaskConfigProps) {
  const handleChange = <K extends keyof typeof action.config>(
    field: K,
    value: (typeof action.config)[K]
  ) => {
    onChange({
      ...action,
      config: {
        ...action.config,
        [field]: value,
      },
    })
  }

  const formatUserLabel = (user: OrganizationUserOption) => {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
    return fullName ? `${fullName} (${user.email})` : user.email
  }

  const links = action.config.links ?? []

  const handleLinkChange = (index: number, value: string) => {
    const updatedLinks = [...links]
    updatedLinks[index] = value
    handleChange("links", updatedLinks)
  }

  const handleAddLink = () => {
    handleChange("links", [...links, ""])
  }

  const handleRemoveLink = (index: number) => {
    handleChange(
      "links",
      links.filter((_, linkIndex) => linkIndex !== index)
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${action.id}-title`}>Task Title</Label>
        <TemplatedTextInput
          id={`${action.id}-title`}
          value={action.config.title}
          onChange={(value) => handleChange("title", value)}
          variables={variables}
          placeholder="Enter task title..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${action.id}-description`}>Description (Optional)</Label>
        <TemplatedTextInput
          id={`${action.id}-description`}
          value={action.config.description || ""}
          onChange={(value) => handleChange("description", value)}
          variables={variables}
          placeholder="Task description..."
          multiline
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Links (Optional)</Label>
          <Button type="button" variant="outline" size="sm" onClick={handleAddLink}>
            <Plus className="mr-1 size-3.5" />
            Add Link
          </Button>
        </div>
        {links.length === 0 ? (
          <p className="text-xs text-muted-foreground">No links added.</p>
        ) : (
          <div className="space-y-2">
            {links.map((link, index) => (
              <div key={`${action.id}-link-${index}`} className="flex items-center gap-2">
                <Input
                  value={link}
                  onChange={(e) => handleLinkChange(index, e.target.value)}
                  placeholder="https://example.com/resource"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveLink(index)}
                  className="shrink-0"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${action.id}-taskType`}>Task Type</Label>
          <Select
            value={action.config.taskType}
            onValueChange={(value) =>
              handleChange("taskType", value as "standard" | "approval")
            }
          >
            <SelectTrigger id={`${action.id}-taskType`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="approval">Approval</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${action.id}-priority`}>Priority</Label>
          <Select
            value={action.config.priority}
            onValueChange={(value) =>
              handleChange("priority", value as "low" | "medium" | "high" | "urgent")
            }
          >
            <SelectTrigger id={`${action.id}-priority`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(getFieldDefinition("task", "priority")?.enumValues ?? ["low", "medium", "high"]).map((p) => (
                <SelectItem key={p} value={p}>
                  {taskPriorityConfig[p as keyof typeof taskPriorityConfig]?.label ?? p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Assign To</Label>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={action.config.assignTo.type}
            onValueChange={(value) => {
              if (value === "role") {
                handleChange("assignTo", { type: "role", role: "" })
                return
              }
              handleChange("assignTo", { type: "user", userId: "" })
            }}
          >
            <SelectTrigger id={`${action.id}-assignType`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="role">Role</SelectItem>
              <SelectItem value="user">Specific User</SelectItem>
            </SelectContent>
          </Select>

          {action.config.assignTo.type === "role" && (
            <Select
              value={action.config.assignTo.role}
              onValueChange={(value) =>
                handleChange("assignTo", { type: "role", role: value })
              }
            >
              <SelectTrigger id={`${action.id}-role`}>
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent>
                {allRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleConfig[role].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {action.config.assignTo.type === "user" && (
            <Select
              value={action.config.assignTo.userId || undefined}
              onValueChange={(value) =>
                handleChange("assignTo", { type: "user", userId: value })
              }
            >
              <SelectTrigger id={`${action.id}-user`}>
                <SelectValue
                  placeholder={
                    organizationUsersLoading
                      ? "Loading organization users..."
                      : "Select organization user..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {action.config.assignTo.type === "user" && action.config.assignTo.userId &&
                  !organizationUsers.some((user) => action.config.assignTo.type === "user" && user.id === action.config.assignTo.userId) && (
                    <SelectItem value={action.config.assignTo.userId}>
                      {action.config.assignTo.userId}
                    </SelectItem>
                  )}
                {organizationUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {formatUserLabel(user)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {action.config.assignTo.type === "user" && !organizationUsersLoading && organizationUsers.length === 0 && (
          <p className="text-xs text-muted-foreground">No users found in your organization.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${action.id}-dueDays`}>Due In (Days) - Optional</Label>
        <Input
          id={`${action.id}-dueDays`}
          type="number"
          value={action.config.dueDays || ""}
          onChange={(e) =>
            handleChange("dueDays", e.target.value ? Number(e.target.value) : undefined)
          }
          placeholder="e.g., 3"
          min="0"
        />
      </div>
    </div>
  )
}
