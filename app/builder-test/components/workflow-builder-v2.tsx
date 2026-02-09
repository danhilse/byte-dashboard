"use client"

import { useEffect, useMemo, useReducer, useRef } from "react"
import type { WorkflowDefinitionV2, WorkflowVariable, StandardStepV2 } from "../types/workflow-v2"
import { StepListV2 } from "./step-list-v2"
import { StepConfigPanelV2 } from "./step-config-panel-v2"
import { TriggerConfigPanel } from "./trigger-config-panel"
import { WorkflowJsonExport } from "./workflow-json-export"
import { WorkflowConfigDialog } from "./workflow-config-dialog"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"
import { getAllVariables } from "@/lib/workflow-builder-v2/variable-utils"
import {
  builderStateReducer,
  createInitialBuilderState,
} from "@/lib/workflow-builder-v2/builder-state"
import { findSelectedStep } from "@/lib/workflow-builder-v2/workflow-operations"

interface WorkflowBuilderV2Props {
  workflow: WorkflowDefinitionV2
  onWorkflowChange: (workflow: WorkflowDefinitionV2) => void
}

export function WorkflowBuilderV2({
  workflow,
  onWorkflowChange,
}: WorkflowBuilderV2Props) {
  const [state, dispatchEvent] = useReducer(
    builderStateReducer,
    workflow,
    createInitialBuilderState
  )
  const hasSyncedInitialWorkflow = useRef(false)

  useEffect(() => {
    if (!hasSyncedInitialWorkflow.current) {
      hasSyncedInitialWorkflow.current = true
      return
    }
    onWorkflowChange(state.workflow)
  }, [onWorkflowChange, state.workflow])

  const selectedStep = useMemo(
    () => findSelectedStep(state.workflow.steps, state.ui.selectedStepId, state.ui.selectedTrackStep),
    [state.workflow.steps, state.ui.selectedStepId, state.ui.selectedTrackStep]
  )

  // Compute all variables (auto-detected + custom)
  const allVariables = useMemo(() => getAllVariables(state.workflow), [state.workflow])

  const handleTriggerChange = (trigger: typeof workflow.trigger) => {
    dispatchEvent({ type: "trigger_changed", trigger })
  }

  const handleStepUpdate = (updatedStep: typeof state.workflow.steps[number]) => {
    dispatchEvent({ type: "step_updated", step: updatedStep })
  }

  const handleStepDelete = (stepId: string) => {
    dispatchEvent({ type: "step_deleted", stepId })
  }

  const handleStepDuplicate = (stepId: string) => {
    dispatchEvent({ type: "step_duplicated", stepId })
  }

  const handleStepAdd = (step: typeof state.workflow.steps[number]) => {
    dispatchEvent({ type: "step_added", step })
  }

  const handleTriggerSelect = () => {
    dispatchEvent({ type: "trigger_selected" })
  }

  const handleStepSelect = (stepId: string) => {
    dispatchEvent({ type: "step_selected", stepId })
  }

  const handleTrackStepAdd = (
    branchId: string,
    trackId: string,
    newStep: StandardStepV2
  ) => {
    dispatchEvent({ type: "track_step_added", branchId, trackId, step: newStep })
  }

  const handleTrackStepDelete = (
    branchId: string,
    trackId: string,
    stepId: string
  ) => {
    dispatchEvent({ type: "track_step_deleted", branchId, trackId, stepId })
  }

  const handleTrackStepSelect = (
    branchId: string,
    trackId: string,
    stepId: string
  ) => {
    dispatchEvent({
      type: "track_step_selected",
      selection: { branchId, trackId, stepId },
    })
  }

  const handleAddVariable = (variable: WorkflowVariable) => {
    dispatchEvent({ type: "variable_added", variable })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{state.workflow.name}</h2>
            {state.workflow.description && (
              <p className="text-sm text-muted-foreground">{state.workflow.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <WorkflowConfigDialog
              workflow={state.workflow}
              onChange={(nextWorkflow) =>
                dispatchEvent({ type: "workflow_replaced", workflow: nextWorkflow })
              }
            />
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
            trigger={state.workflow.trigger}
            steps={state.workflow.steps}
            variables={allVariables}
            selectedStepId={state.ui.selectedStepId}
            selectedTrigger={state.ui.selectedTrigger}
            onTriggerSelect={handleTriggerSelect}
            onStepSelect={handleStepSelect}
            onStepsReorder={(steps) => dispatchEvent({ type: "steps_reordered", steps })}
            onStepAdd={handleStepAdd}
            onStepDelete={handleStepDelete}
            onStepDuplicate={handleStepDuplicate}
            onTrackStepAdd={handleTrackStepAdd}
            onTrackStepDelete={handleTrackStepDelete}
            onTrackStepSelect={handleTrackStepSelect}
            selectedTrackStep={state.ui.selectedTrackStep}
          />
        </div>

        {/* Right Panel - Config Panel (60%) */}
        <div className="flex-1">
          {state.ui.selectedTrigger ? (
            <TriggerConfigPanel
              trigger={state.workflow.trigger}
              onTriggerChange={handleTriggerChange}
              statuses={state.workflow.statuses}
            />
          ) : (
            <StepConfigPanelV2
              step={selectedStep}
              allSteps={state.workflow.steps}
              variables={allVariables}
              statuses={state.workflow.statuses}
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
          onClick={() => dispatchEvent({ type: "json_export_toggled" })}
        >
          {state.ui.showJsonExport ? "Hide" : "Show"} JSON Export
        </Button>
      </div>

      {/* JSON Export Panel */}
      {state.ui.showJsonExport && (
        <div className="border-t">
          <WorkflowJsonExport workflow={state.workflow} />
        </div>
      )}
    </div>
  )
}
