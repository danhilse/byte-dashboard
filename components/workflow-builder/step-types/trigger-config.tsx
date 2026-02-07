"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TriggerStep } from "@/types"

interface TriggerConfigProps {
  step: TriggerStep
  onUpdate: (step: TriggerStep) => void
}

export function TriggerConfig({ step, onUpdate }: TriggerConfigProps) {
  const handleTriggerTypeChange = (value: string) => {
    onUpdate({
      ...step,
      config: {
        ...step.config,
        triggerType: value as "manual" | "form_submission",
      },
    })
  }

  return (
    <div className="grid gap-2">
      <Label>Trigger Type</Label>
      <Select
        value={step.config.triggerType}
        onValueChange={handleTriggerTypeChange}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="manual">Manual</SelectItem>
          <SelectItem value="form_submission">Form Submission</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {step.config.triggerType === "manual"
          ? "Workflow is started manually by a user."
          : "Workflow is triggered when a form is submitted."}
      </p>
    </div>
  )
}
