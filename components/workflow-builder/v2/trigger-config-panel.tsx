"use client"

import { useMemo } from "react"
import type { WorkflowTrigger } from "../types/workflow-v2"
import { TriggerConfig } from "./trigger-config"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { getTriggerVariables } from "@/lib/workflow-builder-v2/variable-utils"
import { Zap } from "lucide-react"
import type { DefinitionStatus } from "@/types"

interface TriggerConfigPanelProps {
  trigger: WorkflowTrigger
  statuses: DefinitionStatus[]
  onTriggerChange: (trigger: WorkflowTrigger) => void
}

export function TriggerConfigPanel({
  trigger,
  statuses,
  onTriggerChange,
}: TriggerConfigPanelProps) {
  const triggerVariables = useMemo(() => getTriggerVariables(trigger), [trigger])

  const getVariableTypeLabel = (type: string) => {
    switch (type) {
      case "form_submission":
        return "Form Data"
      case "contact":
        return "Contact Data"
      case "task":
        return "Task Output"
      case "custom":
        return "Custom"
      case "user":
        return "User"
      default:
        return "Variable"
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2">
            <Zap className="size-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Workflow Trigger</h3>
            <p className="text-sm text-muted-foreground">
              Configure how this workflow is started
            </p>
          </div>
        </div>

        {/* Trigger Config */}
        <TriggerConfig
          trigger={trigger}
          statuses={statuses}
          onChange={onTriggerChange}
        />

        {/* Trigger Variables */}
        <div className="rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-sm font-medium">Auto-Available Variables</h4>
            <span className="text-xs text-muted-foreground">
              {triggerVariables.length} variable{triggerVariables.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            These values are automatically injected from the trigger and can be used in
            actions, branch conditions, and templates.
          </p>
          {triggerVariables.length === 0 ? (
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              No trigger variables are available for this trigger type yet.
            </div>
          ) : (
            <div className="space-y-3">
              {triggerVariables.map((variable) => (
                <div key={variable.id} className="rounded-md bg-muted/50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm font-medium">{variable.name}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {getVariableTypeLabel(variable.type)}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Read Only
                    </Badge>
                  </div>
                  {variable.fields && variable.fields.length > 0 ? (
                    <div className="space-y-1">
                      {variable.fields.map((field) => (
                        <div
                          key={`${variable.id}.${field.key}`}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="font-medium">{field.label}</span>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <code className="rounded bg-background px-1 py-0.5">
                              {`${variable.id}.${field.key}`}
                            </code>
                            <span>{field.dataType}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      No structured fields defined yet.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <h4 className="mb-2 text-sm font-medium">About Triggers</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              • <strong>Manual:</strong> Start workflow by selecting a contact
            </li>
            <li>
              • <strong>Contacts:</strong> Includes contact creation and field-change triggers
            </li>
            <li>
              • <strong>Submenus:</strong> Trigger options are grouped by category for easier scanning
            </li>
            <li>
              • <strong>Coming Soon:</strong> Record state change, SLA breach, webhook,
              recurring schedule, inbound communication, and approval decision triggers
            </li>
          </ul>
        </div>
      </div>
    </ScrollArea>
  )
}
