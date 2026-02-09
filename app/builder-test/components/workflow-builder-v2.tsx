"use client"

import { useState, useMemo } from "react"
import type { WorkflowDefinitionV2, WorkflowStepV2, WorkflowVariable, StandardStepV2, VariableDataType } from "../types/workflow-v2"
import { isBranchStep } from "../types/workflow-v2"
import { StepListV2 } from "./step-list-v2"
import { StepConfigPanelV2 } from "./step-config-panel-v2"
import { TriggerConfigPanel } from "./trigger-config-panel"
import { WorkflowJsonExport } from "./workflow-json-export"
import { WorkflowConfigDialog } from "./workflow-config-dialog"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"
import { getAllVariables } from "@/lib/workflow-builder-v2/variable-utils"

interface WorkflowBuilderV2Props {
  workflow: WorkflowDefinitionV2
  onWorkflowChange: (workflow: WorkflowDefinitionV2) => void
}

export function WorkflowBuilderV2({
  workflow,
  onWorkflowChange,
}: WorkflowBuilderV2Props) {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    workflow.steps[0]?.id || null
  )
  const [selectedTrigger, setSelectedTrigger] = useState(false)
  const [selectedTrackStep, setSelectedTrackStep] = useState<{
    branchId: string
    trackId: string
    stepId: string
  } | null>(null)
  const [showJsonExport, setShowJsonExport] = useState(false)

  // Get selected step - either from main steps or from within a branch track
  const selectedStep = useMemo(() => {
    // First check if it's a main-level step
    const mainStep = workflow.steps.find((s) => s.id === selectedStepId)
    if (mainStep) return mainStep

    // If not, check if it's a step within a branch track
    if (selectedTrackStep) {
      const branch = workflow.steps.find(
        (s) => s.id === selectedTrackStep.branchId && isBranchStep(s)
      )
      if (branch && isBranchStep(branch)) {
        const track = branch.tracks.find((t) => t.id === selectedTrackStep.trackId)
        if (track) {
          return track.steps.find((s) => s.id === selectedTrackStep.stepId)
        }
      }
    }

    return undefined
  }, [workflow.steps, selectedStepId, selectedTrackStep])

  // Compute all variables (auto-detected + custom)
  const allVariables = useMemo(() => getAllVariables(workflow), [workflow])

  const handleTriggerChange = (trigger: typeof workflow.trigger) => {
    onWorkflowChange({
      ...workflow,
      trigger,
      updatedAt: new Date().toISOString(),
    })
  }

  const handleStepsChange = (steps: WorkflowStepV2[]) => {
    onWorkflowChange({
      ...workflow,
      steps,
      updatedAt: new Date().toISOString(),
    })
  }

  const handleStepUpdate = (updatedStep: WorkflowStepV2) => {
    // Check if updating a main-level step
    if (workflow.steps.find((s) => s.id === updatedStep.id)) {
      const newSteps = workflow.steps.map((s) =>
        s.id === updatedStep.id ? updatedStep : s
      )
      handleStepsChange(newSteps)
      return
    }

    // Check if updating a step within a branch track
    if (selectedTrackStep) {
      const newSteps = workflow.steps.map((step) => {
        if (step.id === selectedTrackStep.branchId && isBranchStep(step)) {
          return {
            ...step,
            tracks: step.tracks.map((track) => {
              if (track.id === selectedTrackStep.trackId) {
                return {
                  ...track,
                  steps: track.steps.map((s) =>
                    s.id === updatedStep.id ? updatedStep : s
                  ),
                }
              }
              return track
            }) as [typeof step.tracks[0], typeof step.tracks[1]],
          }
        }
        return step
      })
      handleStepsChange(newSteps)
    }
  }

  const handleStepDelete = (stepId: string) => {
    const newSteps = workflow.steps.filter((s) => s.id !== stepId)
    handleStepsChange(newSteps)
    if (selectedStepId === stepId) {
      setSelectedStepId(newSteps[0]?.id || null)
      setSelectedTrigger(false)
    }
  }

  const handleStepDuplicate = (stepId: string) => {
    const stepIndex = workflow.steps.findIndex((s) => s.id === stepId)
    if (stepIndex === -1) return

    const originalStep = workflow.steps[stepIndex]
    const duplicatedStep: WorkflowStepV2 = isBranchStep(originalStep)
      ? {
          ...originalStep,
          id: `step-${Date.now()}`,
          name: `${originalStep.name} (Copy)`,
        }
      : {
          ...originalStep,
          id: `step-${Date.now()}`,
          name: `${originalStep.name} (Copy)`,
          // Deep copy actions to avoid reference issues
          actions: originalStep.actions.map((action) => ({
            ...action,
            id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          })),
        }

    // Insert the duplicated step right after the original
    const newSteps = [
      ...workflow.steps.slice(0, stepIndex + 1),
      duplicatedStep,
      ...workflow.steps.slice(stepIndex + 1),
    ]

    handleStepsChange(newSteps)
    setSelectedStepId(duplicatedStep.id)
    setSelectedTrigger(false)
  }

  const handleStepAdd = (step: WorkflowStepV2) => {
    handleStepsChange([...workflow.steps, step])
    setSelectedStepId(step.id)
    setSelectedTrigger(false)
  }

  const handleTriggerSelect = () => {
    setSelectedTrigger(true)
    setSelectedStepId(null)
  }

  const handleStepSelect = (stepId: string) => {
    setSelectedStepId(stepId)
    setSelectedTrigger(false)
    setSelectedTrackStep(null)
  }

  const handleTrackStepAdd = (
    branchId: string,
    trackId: string,
    newStep: StandardStepV2
  ) => {
    const newSteps = workflow.steps.map((step) => {
      if (step.id === branchId && isBranchStep(step)) {
        return {
          ...step,
          tracks: step.tracks.map((track) => {
            if (track.id === trackId) {
              return {
                ...track,
                steps: [...track.steps, newStep],
              }
            }
            return track
          }) as [typeof step.tracks[0], typeof step.tracks[1]],
        }
      }
      return step
    })
    handleStepsChange(newSteps)
    // Select the newly added track step
    setSelectedTrackStep({ branchId, trackId, stepId: newStep.id })
    setSelectedStepId(null)
    setSelectedTrigger(false)
  }

  const handleTrackStepDelete = (
    branchId: string,
    trackId: string,
    stepId: string
  ) => {
    const newSteps = workflow.steps.map((step) => {
      if (step.id === branchId && isBranchStep(step)) {
        return {
          ...step,
          tracks: step.tracks.map((track) => {
            if (track.id === trackId) {
              return {
                ...track,
                steps: track.steps.filter((s) => s.id !== stepId),
              }
            }
            return track
          }) as [typeof step.tracks[0], typeof step.tracks[1]],
        }
      }
      return step
    })
    handleStepsChange(newSteps)
    // Clear selection if the deleted step was selected
    if (
      selectedTrackStep?.branchId === branchId &&
      selectedTrackStep?.trackId === trackId &&
      selectedTrackStep?.stepId === stepId
    ) {
      setSelectedTrackStep(null)
      setSelectedStepId(branchId) // Select the branch itself
    }
  }

  const handleTrackStepSelect = (
    branchId: string,
    trackId: string,
    stepId: string
  ) => {
    setSelectedTrackStep({ branchId, trackId, stepId })
    setSelectedStepId(null)
    setSelectedTrigger(false)
  }

  const handleAddVariable = (variable: WorkflowVariable) => {
    onWorkflowChange({
      ...workflow,
      variables: [...workflow.variables, variable],
      updatedAt: new Date().toISOString(),
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{workflow.name}</h2>
            {workflow.description && (
              <p className="text-sm text-muted-foreground">{workflow.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <WorkflowConfigDialog workflow={workflow} onChange={onWorkflowChange} />
            <Button size="sm">
              <Save className="mr-2 size-4" />
              Save Workflow
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Step List (40%) */}
        <div className="w-[40%] border-r">
          <StepListV2
            trigger={workflow.trigger}
            steps={workflow.steps}
            selectedStepId={selectedStepId}
            selectedTrigger={selectedTrigger}
            onTriggerSelect={handleTriggerSelect}
            onStepSelect={handleStepSelect}
            onStepsReorder={handleStepsChange}
            onStepAdd={handleStepAdd}
            onStepDelete={handleStepDelete}
            onStepDuplicate={handleStepDuplicate}
            onStepUpdate={handleStepUpdate}
            onTrackStepAdd={handleTrackStepAdd}
            onTrackStepDelete={handleTrackStepDelete}
            onTrackStepSelect={handleTrackStepSelect}
            selectedTrackStep={selectedTrackStep}
          />
        </div>

        {/* Right Panel - Config Panel (60%) */}
        <div className="flex-1">
          {selectedTrigger ? (
            <TriggerConfigPanel
              trigger={workflow.trigger}
              onTriggerChange={handleTriggerChange}
              statuses={workflow.statuses}
            />
          ) : (
            <StepConfigPanelV2
              step={selectedStep}
              allSteps={workflow.steps}
              variables={allVariables}
              statuses={workflow.statuses}
              onStepUpdate={handleStepUpdate}
              onAddVariable={handleAddVariable}
            />
          )}
        </div>
      </div>

      {/* Footer - JSON Export Toggle */}
      <div className="border-t px-6 py-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowJsonExport(!showJsonExport)}
        >
          {showJsonExport ? "Hide" : "Show"} JSON Export
        </Button>
      </div>

      {/* JSON Export Panel */}
      {showJsonExport && (
        <div className="border-t">
          <WorkflowJsonExport workflow={workflow} />
        </div>
      )}
    </div>
  )
}
