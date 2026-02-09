"use client"

import type { WorkflowAction, WorkflowVariable } from "../../../types/workflow-v2"
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
import { VariableSelector } from "../../variable-selector"
import { allRoles, roleConfig } from "@/lib/roles-config"

interface CreateTaskConfigProps {
  action: Extract<WorkflowAction, { type: "create_task" }>
  variables: WorkflowVariable[]
  onChange: (action: WorkflowAction) => void
}

export function CreateTaskConfig({ action, variables, onChange }: CreateTaskConfigProps) {
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

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${action.id}-title`}>Task Title</Label>
        <Input
          id={`${action.id}-title`}
          value={action.config.title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="Enter task title..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${action.id}-description`}>Description (Optional)</Label>
        <Textarea
          id={`${action.id}-description`}
          value={action.config.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Task description..."
          rows={3}
        />
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
              handleChange("priority", value as "low" | "medium" | "high")
            }
          >
            <SelectTrigger id={`${action.id}-priority`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
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
            <VariableSelector
              value={action.config.assignTo.userId}
              onChange={(value) =>
                handleChange("assignTo", { type: "user", userId: value })
              }
              variables={variables}
              filterByDataType={["user", "email"]}
              allowManualEntry={true}
              placeholder="Select user or enter ID..."
              className="w-full"
            />
          )}
        </div>
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
