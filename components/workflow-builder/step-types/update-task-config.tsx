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
import { VariablePicker } from "../variable-picker"
import type { UpdateTaskStep, WorkflowStep } from "@/types"

const TASK_FIELDS = [
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "description", label: "Description" },
  { value: "assignedRole", label: "Assigned Role" },
  { value: "assignedTo", label: "Assigned To" },
]

interface UpdateTaskConfigProps {
  step: UpdateTaskStep
  steps: WorkflowStep[]
  onUpdate: (step: UpdateTaskStep) => void
}

export function UpdateTaskConfig({
  step,
  steps,
  onUpdate,
}: UpdateTaskConfigProps) {
  const assignTaskSteps = steps.filter((s) => s.type === "assign_task")

  const updateConfig = (partial: Partial<UpdateTaskStep["config"]>) => {
    onUpdate({
      ...step,
      config: { ...step.config, ...partial },
    })
  }

  const addField = () => {
    updateConfig({
      fields: [...step.config.fields, { field: "", value: "" }],
    })
  }

  const updateField = (
    index: number,
    key: "field" | "value",
    value: string
  ) => {
    const fields = [...step.config.fields]
    fields[index] = { ...fields[index], [key]: value }
    updateConfig({ fields })
  }

  const removeField = (index: number) => {
    updateConfig({
      fields: step.config.fields.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>Task Reference</Label>
        <Select
          value={step.config.taskStepId}
          onValueChange={(v) => updateConfig({ taskStepId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an Assign Task step..." />
          </SelectTrigger>
          <SelectContent>
            {assignTaskSteps.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Choose which task (created by an earlier Assign Task step) to update.
        </p>
      </div>

      <div className="grid gap-2">
        <Label>Fields to Update</Label>
        {step.config.fields.map((f, index) => (
          <div key={index} className="flex items-center gap-2">
            <Select
              value={f.field}
              onValueChange={(v) => updateField(index, "field", v)}
            >
              <SelectTrigger className="w-2/5">
                <SelectValue placeholder="Field..." />
              </SelectTrigger>
              <SelectContent>
                {TASK_FIELDS.map((tf) => (
                  <SelectItem key={tf.value} value={tf.value}>
                    {tf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground shrink-0">=</span>
            <Input
              placeholder="Value or {{variable}}"
              value={f.value}
              onChange={(e) => updateField(index, "value", e.target.value)}
              className="flex-1"
            />
            <VariablePicker
              steps={steps}
              currentStepId={step.id}
              onInsert={(v) => updateField(index, "value", f.value + v)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeField(index)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addField}>
          <Plus className="mr-2 size-4" />
          Add Field
        </Button>
      </div>
    </div>
  )
}
