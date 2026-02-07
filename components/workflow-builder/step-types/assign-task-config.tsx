"use client"

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
import type { AssignTaskStep, TaskType, TaskPriority } from "@/types"

interface AssignTaskConfigProps {
  step: AssignTaskStep
  onUpdate: (step: AssignTaskStep) => void
}

export function AssignTaskConfig({ step, onUpdate }: AssignTaskConfigProps) {
  const updateConfig = (
    partial: Partial<AssignTaskStep["config"]>
  ) => {
    onUpdate({
      ...step,
      config: { ...step.config, ...partial },
    })
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="task-title">Task Title</Label>
        <Input
          id="task-title"
          placeholder="e.g. Review Submission"
          value={step.config.title}
          onChange={(e) => updateConfig({ title: e.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="task-description">Description (optional)</Label>
        <Textarea
          id="task-description"
          placeholder="What should the assignee do?"
          value={step.config.description ?? ""}
          onChange={(e) => updateConfig({ description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Task Type</Label>
          <Select
            value={step.config.taskType}
            onValueChange={(v) => updateConfig({ taskType: v as TaskType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="approval">Approval</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Priority</Label>
          <Select
            value={step.config.priority}
            onValueChange={(v) =>
              updateConfig({ priority: v as TaskPriority })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Assign To</Label>
        <Select
          value={step.config.assignTo.type}
          onValueChange={(v) => {
            if (v === "role") {
              updateConfig({
                assignTo: { type: "role", role: step.config.assignTo.type === "role" ? step.config.assignTo.role : "" },
              })
            } else {
              updateConfig({
                assignTo: { type: "user", userId: step.config.assignTo.type === "user" ? step.config.assignTo.userId : "" },
              })
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="role">Assign by Role</SelectItem>
            <SelectItem value="user">Assign to Specific User</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {step.config.assignTo.type === "role" && (
        <div className="grid gap-2">
          <Label htmlFor="assign-role">Role</Label>
          <Input
            id="assign-role"
            placeholder="e.g. reviewer, manager"
            value={step.config.assignTo.role}
            onChange={(e) =>
              updateConfig({
                assignTo: { type: "role", role: e.target.value },
              })
            }
          />
        </div>
      )}

      {step.config.assignTo.type === "user" && (
        <div className="grid gap-2">
          <Label htmlFor="assign-user">User ID</Label>
          <Input
            id="assign-user"
            placeholder="Clerk user ID"
            value={step.config.assignTo.userId}
            onChange={(e) =>
              updateConfig({
                assignTo: { type: "user", userId: e.target.value },
              })
            }
          />
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="due-days">Due in (days, optional)</Label>
        <Input
          id="due-days"
          type="number"
          min={1}
          placeholder="e.g. 7"
          value={step.config.dueDays ?? ""}
          onChange={(e) =>
            updateConfig({
              dueDays: e.target.value ? parseInt(e.target.value, 10) : undefined,
            })
          }
        />
      </div>
    </div>
  )
}
