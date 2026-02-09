"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fallbackWorkflowStatuses, fallbackWorkflowStatusConfig } from "@/lib/status-config"
import type { UpdateStatusStep, DefinitionStatus } from "@/types"

interface UpdateStatusConfigProps {
  step: UpdateStatusStep
  onUpdate: (step: UpdateStatusStep) => void
  definitionStatuses?: DefinitionStatus[]
}

export function UpdateStatusConfig({
  step,
  onUpdate,
  definitionStatuses,
}: UpdateStatusConfigProps) {
  const sortedDefStatuses = definitionStatuses?.length
    ? [...definitionStatuses].sort((a, b) => a.order - b.order)
    : null

  return (
    <div className="grid gap-2">
      <Label>Status</Label>
      <Select
        value={step.config.status}
        onValueChange={(v) =>
          onUpdate({
            ...step,
            config: { ...step.config, status: v },
          })
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortedDefStatuses
            ? sortedDefStatuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  <div className="flex items-center gap-2">
                    {status.color && (
                      <span
                        className="inline-block size-2 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                    )}
                    {status.label}
                  </div>
                </SelectItem>
              ))
            : fallbackWorkflowStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {fallbackWorkflowStatusConfig[status].label}
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
