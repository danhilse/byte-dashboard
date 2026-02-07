"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { WaitForTaskStep } from "@/types"

interface WaitForTaskConfigProps {
  step: WaitForTaskStep
  onUpdate: (step: WaitForTaskStep) => void
}

export function WaitForTaskConfig({ step, onUpdate }: WaitForTaskConfigProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="timeout-days">Timeout (days)</Label>
      <Input
        id="timeout-days"
        type="number"
        min={1}
        value={step.config.timeoutDays}
        onChange={(e) =>
          onUpdate({
            ...step,
            config: {
              ...step.config,
              timeoutDays: parseInt(e.target.value, 10) || 1,
            },
          })
        }
      />
      <p className="text-xs text-muted-foreground">
        The workflow will wait for the task to be completed. If not completed
        within this timeout, the workflow status will be set to &quot;timeout&quot;.
      </p>
    </div>
  )
}
