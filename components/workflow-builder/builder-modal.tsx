"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StepList } from "./step-list"
import { StepConfigPanel } from "./step-config-panel"
import type { WorkflowDefinition, WorkflowStep } from "@/types"

interface BuilderModalProps {
  definition: WorkflowDefinition | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updated: WorkflowDefinition) => void
}

export function BuilderModal({
  definition,
  open,
  onOpenChange,
  onSave,
}: BuilderModalProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Sync steps from definition when it changes
  useEffect(() => {
    if (definition) {
      const stepsData = definition.steps as { steps: WorkflowStep[] } | null
      setSteps(stepsData?.steps ?? [])
      setSelectedStepId(null)
      setIsDirty(false)
    }
  }, [definition])

  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? null

  const handleStepsChange = useCallback((newSteps: WorkflowStep[]) => {
    setSteps(newSteps)
    setIsDirty(true)
  }, [])

  const handleStepUpdate = useCallback(
    (updatedStep: WorkflowStep) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === updatedStep.id ? updatedStep : s))
      )
      setIsDirty(true)
    },
    []
  )

  const handleDeleteStep = useCallback(
    (stepId: string) => {
      setSteps((prev) => prev.filter((s) => s.id !== stepId))
      if (selectedStepId === stepId) {
        setSelectedStepId(null)
      }
      setIsDirty(true)
    },
    [selectedStepId]
  )

  const handleSave = () => {
    if (!definition) return
    onSave({
      ...definition,
      steps: { steps },
    })
    setIsDirty(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  if (!definition) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <DialogTitle>Edit: {definition.name}</DialogTitle>
            <Badge variant="secondary">v{definition.version}</Badge>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left pane: Step list */}
          <div className="w-[40%] border-r overflow-y-auto p-4">
            <StepList
              steps={steps}
              selectedStepId={selectedStepId}
              onSelectStep={setSelectedStepId}
              onStepsChange={handleStepsChange}
              onDeleteStep={handleDeleteStep}
            />
          </div>

          {/* Right pane: Config panel */}
          <div className="w-[60%] overflow-y-auto p-4">
            <StepConfigPanel
              step={selectedStep}
              steps={steps}
              onStepUpdate={handleStepUpdate}
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isDirty}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
