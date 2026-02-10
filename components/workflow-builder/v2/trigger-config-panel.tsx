"use client"

import type { WorkflowTrigger } from "../types/workflow-v2"
import { TriggerConfig } from "./trigger-config"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Zap } from "lucide-react"

interface TriggerConfigPanelProps {
  trigger: WorkflowTrigger
  onTriggerChange: (trigger: WorkflowTrigger) => void
}

export function TriggerConfigPanel({
  trigger,
  onTriggerChange,
}: TriggerConfigPanelProps) {
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
        <TriggerConfig trigger={trigger} onChange={onTriggerChange} />

        {/* Info Box */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <h4 className="mb-2 text-sm font-medium">About Triggers</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              • <strong>Manual:</strong> Start workflow by selecting a contact
            </li>
            <li>
              • <strong>Contact Created:</strong> Auto-start when a new contact is added
            </li>
            <li>
              • <strong>Contact Field Changed:</strong> Auto-start when watched fields change
            </li>
            <li>
              • <strong>Form Submission:</strong> Start when external form is submitted
            </li>
            <li>
              • <strong>API Call:</strong> Start via external system integration
            </li>
          </ul>
        </div>
      </div>
    </ScrollArea>
  )
}
