"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { DelayStep } from "@/types"

interface DelayConfigProps {
  step: DelayStep
  onUpdate: (step: DelayStep) => void
}

export function DelayConfig({ step, onUpdate }: DelayConfigProps) {
  const updateConfig = (partial: Partial<DelayStep["config"]>) => {
    onUpdate({
      ...step,
      config: { ...step.config, ...partial },
    })
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="delay-duration">Duration</Label>
          <Input
            id="delay-duration"
            type="number"
            min={1}
            value={step.config.duration}
            onChange={(e) =>
              updateConfig({
                duration: Math.max(1, parseInt(e.target.value, 10) || 1),
              })
            }
          />
        </div>

        <div className="grid gap-2">
          <Label>Unit</Label>
          <Select
            value={step.config.unit}
            onValueChange={(v) =>
              updateConfig({ unit: v as "hours" | "days" })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hours">Hours</SelectItem>
              <SelectItem value="days">Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        This delay is durable — it survives server restarts and will resume
        accurately even after hours or days.
      </p>
    </div>
  )
}
