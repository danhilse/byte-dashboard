"use client"

import { Braces } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { WorkflowStep } from "@/types"
import { useState } from "react"

interface VariablePickerProps {
  steps: WorkflowStep[]
  currentStepId: string
  onInsert: (variable: string) => void
}

const CONTACT_VARIABLES = [
  { key: "contact.firstName", label: "First Name" },
  { key: "contact.lastName", label: "Last Name" },
  { key: "contact.email", label: "Email" },
  { key: "contact.phone", label: "Phone" },
  { key: "contact.id", label: "ID" },
]

function getStepOutputVariables(
  step: WorkflowStep
): { key: string; label: string }[] {
  switch (step.type) {
    case "assign_task":
      return [{ key: `${step.id}.taskId`, label: "Task ID" }]
    case "wait_for_task":
      return [
        { key: `${step.id}.completedBy`, label: "Completed By" },
        { key: `${step.id}.taskId`, label: "Task ID" },
      ]
    case "wait_for_approval":
      return [
        { key: `${step.id}.outcome`, label: "Outcome" },
        { key: `${step.id}.comment`, label: "Comment" },
        { key: `${step.id}.approvedBy`, label: "Approved By" },
      ]
    default:
      return []
  }
}

export function VariablePicker({
  steps,
  currentStepId,
  onInsert,
}: VariablePickerProps) {
  const [open, setOpen] = useState(false)

  const currentIndex = steps.findIndex((s) => s.id === currentStepId)
  const precedingSteps = currentIndex > 0 ? steps.slice(0, currentIndex) : []

  const stepOutputs = precedingSteps
    .map((s) => ({
      step: s,
      variables: getStepOutputVariables(s),
    }))
    .filter((entry) => entry.variables.length > 0)

  const handleInsert = (key: string) => {
    onInsert(`{{${key}}}`)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground"
          title="Insert variable"
        >
          <Braces className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="max-h-64 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
            Contact
          </div>
          {CONTACT_VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left"
              onClick={() => handleInsert(v.key)}
            >
              <code className="text-xs text-muted-foreground">{`{{${v.key}}}`}</code>
            </button>
          ))}

          {stepOutputs.length > 0 && (
            <>
              <div className="border-t px-3 py-2 text-xs font-medium text-muted-foreground">
                Step Outputs
              </div>
              {stepOutputs.map(({ step, variables }) => (
                <div key={step.id}>
                  <div className="px-3 py-1 text-xs text-muted-foreground/70">
                    {step.label}
                  </div>
                  {variables.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left"
                      onClick={() => handleInsert(v.key)}
                    >
                      <code className="text-xs text-muted-foreground">{`{{${v.key}}}`}</code>
                    </button>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
