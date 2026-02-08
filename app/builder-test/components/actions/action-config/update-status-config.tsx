"use client"

import type { WorkflowAction, WorkflowVariable, WorkflowStatus } from "../../../types/workflow-v2"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface UpdateStatusConfigProps {
  action: Extract<WorkflowAction, { type: "update_status" }>
  variables: WorkflowVariable[]
  statuses: WorkflowStatus[]
  onChange: (action: WorkflowAction) => void
}

export function UpdateStatusConfig({
  action,
  variables,
  statuses,
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

  // Sort statuses by order
  const sortedStatuses = [...statuses].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${action.id}-status`}>New Workflow Status</Label>
        <Select value={action.config.status} onValueChange={handleChange}>
          <SelectTrigger id={`${action.id}-status`}>
            <SelectValue placeholder="Select status..." />
          </SelectTrigger>
          <SelectContent>
            {sortedStatuses.length === 0 ? (
              <SelectItem value="_none" disabled>
                No statuses defined for this workflow
              </SelectItem>
            ) : (
              sortedStatuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  <div className="flex items-center gap-2">
                    {status.color && (
                      <div
                        className="size-2 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                    )}
                    {status.label}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          This updates the workflow execution's status (workflow-specific)
        </p>
      </div>
    </div>
  )
}
