"use client"

import type { WorkflowTrigger } from "../types/workflow-v2"
import { Badge } from "@/components/ui/badge"
import { Play, UserCheck, Webhook, Code } from "lucide-react"
import { cn } from "@/lib/utils"

interface TriggerCardProps {
  trigger: WorkflowTrigger
  isSelected: boolean
  onSelect: () => void
}

export function TriggerCard({ trigger, isSelected, onSelect }: TriggerCardProps) {
  const getTriggerDisplay = () => {
    switch (trigger.type) {
      case "manual":
        return {
          icon: Play,
          label: "Manual Start",
          description: "User initiates workflow for a contact",
        }
      case "contact_status":
        return {
          icon: UserCheck,
          label: "Contact Status Change",
          description: `When contact reaches: ${trigger.statusValue || "(not set)"}`,
        }
      case "form_submission":
        return {
          icon: Webhook,
          label: "Form Submission",
          description: `Form ID: ${trigger.formId || "(not set)"}`,
        }
      case "api":
        return {
          icon: Code,
          label: "API Call",
          description: "External system starts workflow",
        }
    }
  }

  const display = getTriggerDisplay()
  const Icon = display.icon

  return (
    <div
      className={cn(
        "rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 p-3 shadow-sm transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onSelect}
    >
      {/* Content */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="rounded-md bg-primary/10 p-2">
          <Icon className="size-4 text-primary" />
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{display.label}</span>
            <Badge variant="secondary" className="text-xs">
              Trigger
            </Badge>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {display.description}
          </div>
        </div>
      </div>
    </div>
  )
}
