"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { allWorkflowStatuses, workflowStatusConfig } from "@/lib/status-config"
import type { UpdateStatusStep, WorkflowStatus } from "@/types"

interface UpdateStatusConfigProps {
  step: UpdateStatusStep
  onUpdate: (step: UpdateStatusStep) => void
}

export function UpdateStatusConfig({
  step,
  onUpdate,
}: UpdateStatusConfigProps) {
  return (
    <div className="grid gap-2">
      <Label>Status</Label>
      <Select
        value={step.config.status}
        onValueChange={(v) =>
          onUpdate({
            ...step,
            config: { ...step.config, status: v as WorkflowStatus },
          })
        }
      >
        <SelectTrigger>
          <SelectValue />
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
        The workflow execution&apos;s status will be updated to this value.
      </p>
    </div>
  )
}
