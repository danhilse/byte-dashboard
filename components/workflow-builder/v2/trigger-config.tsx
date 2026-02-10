"use client"

import type { WorkflowTrigger, TriggerType } from "../types/workflow-v2"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Play, UserCheck, UserPlus, Webhook, Code } from "lucide-react"

interface TriggerConfigProps {
  trigger: WorkflowTrigger
  onChange: (trigger: WorkflowTrigger) => void
}

const CONTACT_FIELD_OPTIONS = [
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "company", label: "Company" },
  { value: "role", label: "Role" },
  { value: "status", label: "Status" },
  { value: "tags", label: "Tags" },
]

export function TriggerConfig({ trigger, onChange }: TriggerConfigProps) {
  const handleTypeChange = (type: TriggerType) => {
    switch (type) {
      case "manual":
        onChange({ type: "manual" })
        break
      case "contact_created":
        onChange({ type: "contact_created" })
        break
      case "contact_field_changed":
        onChange({ type: "contact_field_changed", watchedFields: [] })
        break
      case "form_submission":
        onChange({ type: "form_submission", formId: "" })
        break
      case "api":
        onChange({ type: "api" })
        break
    }
  }

  const toggleWatchedField = (field: string, checked: boolean) => {
    if (trigger.type !== "contact_field_changed") {
      return
    }

    const nextFields = checked
      ? [...new Set([...trigger.watchedFields, field])]
      : trigger.watchedFields.filter((item) => item !== field)

    onChange({
      type: "contact_field_changed",
      watchedFields: nextFields,
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="trigger-type">Trigger Type</Label>
        <Select value={trigger.type} onValueChange={handleTypeChange}>
          <SelectTrigger id="trigger-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">
              <div className="flex items-center gap-2">
                <Play className="size-4" />
                Manual Start
              </div>
            </SelectItem>
            <SelectItem value="contact_created">
              <div className="flex items-center gap-2">
                <UserPlus className="size-4" />
                When Contact Is Created
              </div>
            </SelectItem>
            <SelectItem value="contact_field_changed">
              <div className="flex items-center gap-2">
                <UserCheck className="size-4" />
                When Contact Fields Change
              </div>
            </SelectItem>
            <SelectItem value="form_submission" disabled>
              <div className="flex items-center gap-2">
                <Webhook className="size-4" />
                When Form Submitted
              </div>
            </SelectItem>
            <SelectItem value="api" disabled>
              <div className="flex items-center gap-2">
                <Code className="size-4" />
                API Call
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Type-specific config */}
      {trigger.type === "manual" && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <p>Workflow will be started manually by a user selecting a contact.</p>
        </div>
      )}

      {trigger.type === "contact_created" && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <p>Workflow starts automatically when a new contact is created.</p>
        </div>
      )}

      {trigger.type === "contact_field_changed" && (
        <div className="space-y-2">
          <Label>Fields to Watch</Label>
          <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
            {CONTACT_FIELD_OPTIONS.map((field) => (
              <label key={field.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={trigger.watchedFields.includes(field.value)}
                  onCheckedChange={(checked) =>
                    toggleWatchedField(field.value, Boolean(checked))
                  }
                />
                <span>{field.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {trigger.watchedFields.length === 0
              ? "No fields selected: workflow will trigger on any contact field change."
              : "Workflow will trigger when any selected field changes."}
          </p>
        </div>
      )}

      {trigger.type === "form_submission" && (
        <div className="space-y-2">
          <Label htmlFor="form-id">Form ID</Label>
          <Input
            id="form-id"
            value={trigger.formId}
            onChange={(e) =>
              onChange({ type: "form_submission", formId: e.target.value })
            }
            placeholder="Enter external form ID"
          />
          <p className="text-xs text-muted-foreground">
            Workflow starts when this form is submitted
          </p>
        </div>
      )}

      {trigger.type === "api" && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <p>Workflow will be started via API call with contact ID.</p>
          <p className="mt-2">
            <code className="rounded bg-muted px-1 py-0.5">
              POST /api/workflows/{"{workflow-id}"}/start
            </code>
          </p>
        </div>
      )}
    </div>
  )
}
