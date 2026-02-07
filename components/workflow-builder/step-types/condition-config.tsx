"use client"

import { Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ConditionStep, WorkflowStep } from "@/types"

interface ConditionConfigProps {
  step: ConditionStep
  steps: WorkflowStep[]
  onUpdate: (step: ConditionStep) => void
}

export function ConditionConfig({
  step,
  steps,
  onUpdate,
}: ConditionConfigProps) {
  const otherSteps = steps.filter((s) => s.id !== step.id)

  const updateConfig = (partial: Partial<ConditionStep["config"]>) => {
    onUpdate({
      ...step,
      config: { ...step.config, ...partial },
    })
  }

  const addBranch = () => {
    updateConfig({
      branches: [
        ...step.config.branches,
        { value: "", gotoStepId: "" },
      ],
    })
  }

  const updateBranch = (
    index: number,
    field: "value" | "gotoStepId",
    value: string
  ) => {
    const branches = [...step.config.branches]
    branches[index] = { ...branches[index], [field]: value }
    updateConfig({ branches })
  }

  const removeBranch = (index: number) => {
    updateConfig({
      branches: step.config.branches.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="condition-field">Field</Label>
        <Input
          id="condition-field"
          placeholder='e.g. {{step_id.outcome}}'
          value={step.config.field}
          onChange={(e) => updateConfig({ field: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Use <code className="text-xs">{"{{stepId.fieldName}}"}</code> to reference
          a value from a previous step (e.g. approval outcome).
        </p>
      </div>

      <div className="grid gap-2">
        <Label>Branches</Label>
        {step.config.branches.map((branch, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder="Value"
              value={branch.value}
              onChange={(e) => updateBranch(index, "value", e.target.value)}
              className="w-1/3"
            />
            <span className="text-xs text-muted-foreground shrink-0">go to</span>
            <Select
              value={branch.gotoStepId}
              onValueChange={(v) => updateBranch(index, "gotoStepId", v)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select step..." />
              </SelectTrigger>
              <SelectContent>
                {otherSteps.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeBranch(index)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addBranch}>
          <Plus className="mr-2 size-4" />
          Add Branch
        </Button>
      </div>

      <div className="grid gap-2">
        <Label>Default (no match)</Label>
        <Select
          value={step.config.defaultGotoStepId ?? ""}
          onValueChange={(v) =>
            updateConfig({ defaultGotoStepId: v || undefined })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Continue to next step" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Continue to next step</SelectItem>
            {otherSteps.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
