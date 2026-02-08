"use client"

import type { WorkflowAction, WorkflowVariable } from "../../../types/workflow-v2"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { allWorkflowStatuses, workflowStatusConfig } from "@/lib/status-config"

interface UpdateStatusConfigProps {
  action: Extract<WorkflowAction, { type: "update_status" }>
  variables: WorkflowVariable[]
  onChange: (action: WorkflowAction) => void
}

export function UpdateStatusConfig({
  action,
  variables,
  onChange,
}: UpdateStatusConfigProps) {
  const handleChange = (status: string) => {
    onChange({
      ...action,
      config: {
        ...action.config,
        status,
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${action.id}-status`}>New Workflow Status</Label>
        <Select value={action.config.status} onValueChange={handleChange}>
          <SelectTrigger id={`${action.id}-status`}>
            <SelectValue placeholder="Select status..." />
          </SelectTrigger>
          <SelectContent>
            {allWorkflowStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {workflowStatusConfig[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          This updates the workflow's status field
        </p>
      </div>
    </div>
  )
}
