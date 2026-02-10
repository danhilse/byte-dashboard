"use client"

import type { WorkflowAction } from "../../../types/workflow-v2"
import { allRoles, roleConfig } from "@/lib/roles-config"
import type { Role } from "@/lib/roles-config"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { OrganizationUserOption } from "../../organization-user-option"

interface NotificationConfigProps {
  action: Extract<WorkflowAction, { type: "notification" }>
  organizationUsers: OrganizationUserOption[]
  organizationUsersLoading: boolean
  onChange: (action: WorkflowAction) => void
}

type RecipientType = Extract<WorkflowAction, { type: "notification" }>["config"]["recipients"]["type"]

export function NotificationConfig({
  action,
  organizationUsers,
  organizationUsersLoading,
  onChange,
}: NotificationConfigProps) {
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

  const handleRecipientsTypeChange = (type: RecipientType) => {
    switch (type) {
      case "user":
        handleChange("recipients", { type: "user", userId: "" })
        break
      case "group":
        handleChange("recipients", { type: "group", groupIds: [] })
        break
      case "role":
        handleChange("recipients", { type: "role", role: "" })
        break
      case "organization":
        handleChange("recipients", { type: "organization" })
        break
    }
  }

  const recipients = action.config.recipients

  const formatUserLabel = (user: OrganizationUserOption) => {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
    return fullName ? `${fullName} (${user.email})` : user.email
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${action.id}-recipient-type`}>Notify</Label>
        <Select
          value={recipients.type}
          onValueChange={(value) => handleRecipientsTypeChange(value as RecipientType)}
        >
          <SelectTrigger id={`${action.id}-recipient-type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Specific User</SelectItem>
            <SelectItem value="group">Group of Users</SelectItem>
            <SelectItem value="role">Specific Role</SelectItem>
            <SelectItem value="organization">All in Organization</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {recipients.type === "user" && (
        <div className="space-y-2">
          <Label htmlFor={`${action.id}-user`}>User</Label>
          <Select
            value={recipients.userId || undefined}
            onValueChange={(value) => handleChange("recipients", { type: "user", userId: value })}
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
              {recipients.userId &&
                !organizationUsers.some((user) => user.id === recipients.userId) && (
                  <SelectItem value={recipients.userId}>{recipients.userId}</SelectItem>
                )}
              {organizationUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {formatUserLabel(user)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose from users in your organization.
          </p>
          {!organizationUsersLoading && organizationUsers.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No users found in your organization.
            </p>
          )}
        </div>
      )}

      {recipients.type === "group" && (
        <div className="space-y-2">
          <Label htmlFor={`${action.id}-groups`}>Groups</Label>
          <Input
            id={`${action.id}-groups`}
            value={recipients.groupIds.join(", ")}
            onChange={(e) =>
              handleChange("recipients", {
                type: "group",
                groupIds: e.target.value
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean),
              })
            }
            placeholder="e.g., recruiting, onboarding-team"
          />
          <p className="text-xs text-muted-foreground">
            Enter one or more group IDs/names, separated by commas
          </p>
        </div>
      )}

      {recipients.type === "role" && (
        <div className="space-y-2">
          <Label htmlFor={`${action.id}-role`}>Role</Label>
          <Select
            value={recipients.role}
            onValueChange={(value) => handleChange("recipients", { type: "role", role: value })}
          >
            <SelectTrigger id={`${action.id}-role`}>
              <SelectValue placeholder="Select role..." />
            </SelectTrigger>
            <SelectContent>
              {allRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {roleConfig[role as Role].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {recipients.type === "organization" && (
        <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          This notification will be sent to all users in the organization.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor={`${action.id}-title`}>Notification Title</Label>
        <Input
          id={`${action.id}-title`}
          value={action.config.title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="Enter notification title..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${action.id}-message`}>Message</Label>
        <Textarea
          id={`${action.id}-message`}
          value={action.config.message}
          onChange={(e) => handleChange("message", e.target.value)}
          placeholder="Enter notification message..."
          rows={4}
        />
      </div>
    </div>
  )
}
