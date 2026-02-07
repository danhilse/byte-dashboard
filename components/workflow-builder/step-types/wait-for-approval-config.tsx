"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { WaitForApprovalStep } from "@/types"

interface WaitForApprovalConfigProps {
  step: WaitForApprovalStep
  onUpdate: (step: WaitForApprovalStep) => void
}

export function WaitForApprovalConfig({
  step,
  onUpdate,
}: WaitForApprovalConfigProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="approval-timeout">Timeout (days)</Label>
        <Input
          id="approval-timeout"
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
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <Label htmlFor="require-comment">Require Comment</Label>
          <p className="text-xs text-muted-foreground">
            Require the approver to provide a comment.
          </p>
        </div>
        <Switch
          id="require-comment"
          checked={step.config.requireComment ?? false}
          onCheckedChange={(checked) =>
            onUpdate({
              ...step,
              config: { ...step.config, requireComment: checked },
            })
          }
        />
      </div>
    </div>
  )
}
