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
import type { UpdateContactStep, WorkflowStep } from "@/types"

const CONTACT_FIELDS = [
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "company", label: "Company" },
  { value: "role", label: "Role" },
  { value: "status", label: "Status" },
  { value: "addressLine1", label: "Address Line 1" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "zip", label: "Zip" },
]

interface UpdateContactConfigProps {
  step: UpdateContactStep
  steps: WorkflowStep[]
  onUpdate: (step: UpdateContactStep) => void
}

export function UpdateContactConfig({
  step,
  steps,
  onUpdate,
}: UpdateContactConfigProps) {
  const updateConfig = (partial: Partial<UpdateContactStep["config"]>) => {
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
                {CONTACT_FIELDS.map((cf) => (
                  <SelectItem key={cf.value} value={cf.value}>
                    {cf.label}
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
