"use client"

import type { WorkflowTrigger, TriggerType, WorkflowStatus } from "../types/workflow-v2"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Play, UserCheck, Webhook, Code } from "lucide-react"
import { useMemo } from "react"

interface TriggerConfigProps {
  trigger: WorkflowTrigger
  onChange: (trigger: WorkflowTrigger) => void
  statuses: WorkflowStatus[]
}

export function TriggerConfig({ trigger, onChange, statuses }: TriggerConfigProps) {
  // Sort statuses by order
  const sortedStatuses = useMemo(
    () => [...statuses].sort((a, b) => a.order - b.order),
    [statuses]
  )
  const handleTypeChange = (type: TriggerType) => {
    switch (type) {
      case "manual":
        onChange({ type: "manual" })
        break
      case "contact_status":
        onChange({ type: "contact_status", statusValue: "" })
        break
      case "form_submission":
        onChange({ type: "form_submission", formId: "" })
        break
      case "api":
        onChange({ type: "api" })
        break
    }
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
            <SelectItem value="contact_status">
              <div className="flex items-center gap-2">
                <UserCheck className="size-4" />
                When Contact Status Changes
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

      {trigger.type === "contact_status" && (
        <div className="space-y-2">
          <Label htmlFor="status-value">Status Value</Label>
          <Select
            value={trigger.statusValue}
            onValueChange={(value) =>
              onChange({ type: "contact_status", statusValue: value })
            }
          >
            <SelectTrigger id="status-value">
              <SelectValue placeholder="Select status..." />
            </SelectTrigger>
            <SelectContent>
              {sortedStatuses.map((status) => (
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
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Workflow starts when contact reaches this status
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
