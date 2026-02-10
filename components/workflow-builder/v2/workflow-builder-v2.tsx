"use client"

import { useEffect, useMemo, useReducer, useRef } from "react"
import type { WorkflowDefinitionV2, WorkflowVariable, StandardStepV2 } from "../types/workflow-v2"
import { StepListV2 } from "./step-list-v2"
import { StepConfigPanelV2 } from "./step-config-panel-v2"
import { TriggerConfigPanel } from "./trigger-config-panel"
import { WorkflowConfigDialog } from "./workflow-config-dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Save } from "lucide-react"
import { getAllVariables } from "@/lib/workflow-builder-v2/variable-utils"
import {
  builderSessionReducer,
  createInitialBuilderSessionState,
} from "@/lib/workflow-builder-v2/builder-session-state"
import { findSelectedStep } from "@/lib/workflow-builder-v2/workflow-operations"

interface WorkflowBuilderV2Props {
  workflow: WorkflowDefinitionV2
  onWorkflowChange: (workflow: WorkflowDefinitionV2) => void
  onSave?: (workflow: WorkflowDefinitionV2) => void | Promise<void>
  isSaving?: boolean
  saveDisabled?: boolean
}

export function WorkflowBuilderV2({
  workflow,
  onWorkflowChange,
  onSave,
  isSaving = false,
  saveDisabled = false,
}: WorkflowBuilderV2Props) {
  const [session, dispatchEvent] = useReducer(
    builderSessionReducer,
    workflow,
    createInitialBuilderSessionState
  )
  const hasSyncedInitialWorkflow = useRef(false)

  useEffect(() => {
    if (!hasSyncedInitialWorkflow.current) {
      hasSyncedInitialWorkflow.current = true
      return
    }
    onWorkflowChange(session.builder.workflow)
  }, [onWorkflowChange, session.builder.workflow])

  const selectedStep = useMemo(
    () =>
      findSelectedStep(
        session.builder.workflow.steps,
        session.builder.ui.selectedStepId,
        session.builder.ui.selectedTrackStep
      ),
    [
      session.builder.workflow.steps,
      session.builder.ui.selectedStepId,
      session.builder.ui.selectedTrackStep,
    ]
  )

  // Compute all variables (auto-detected + custom)
  const allVariables = useMemo(
    () => getAllVariables(session.builder.workflow),
    [session.builder.workflow]
  )

  const handleTriggerChange = (trigger: typeof workflow.trigger) => {
    dispatchEvent({ type: "trigger_changed", trigger })
  }

  const handleStepUpdate = (updatedStep: typeof session.builder.workflow.steps[number]) => {
    dispatchEvent({ type: "step_updated", step: updatedStep })
  }

  const handleStepDelete = (stepId: string) => {
    dispatchEvent({ type: "step_deleted", stepId })
  }

  const handleStepDuplicate = (stepId: string) => {
    dispatchEvent({ type: "step_duplicated", stepId })
  }

  const handleStepAdd = (step: typeof session.builder.workflow.steps[number]) => {
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
            <h2 className="text-lg font-semibold">{session.builder.workflow.name}</h2>
            {session.builder.workflow.description && (
              <p className="text-sm text-muted-foreground">{session.builder.workflow.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <WorkflowConfigDialog
              workflow={session.builder.workflow}
              commands={session.definitionCommandLog}
              onClearCommands={() => dispatchEvent({ type: "definition_command_log_cleared" })}
              onChange={(nextWorkflow) =>
                dispatchEvent({ type: "workflow_replaced", workflow: nextWorkflow })
              }
            />
            <Button
              size="sm"
              onClick={() => onSave?.(session.builder.workflow)}
              disabled={!onSave || saveDisabled || isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              {isSaving ? "Saving..." : "Save Workflow"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Step List (40%) */}
        <div className="w-[40%] border-r">
          <StepListV2
            trigger={session.builder.workflow.trigger}
            steps={session.builder.workflow.steps}
            variables={allVariables}
            selectedStepId={session.builder.ui.selectedStepId}
            selectedTrigger={session.builder.ui.selectedTrigger}
            onTriggerSelect={handleTriggerSelect}
            onStepSelect={handleStepSelect}
            onStepsReorder={(steps) => dispatchEvent({ type: "steps_reordered", steps })}
            onStepAdd={handleStepAdd}
            onStepDelete={handleStepDelete}
            onStepDuplicate={handleStepDuplicate}
            onTrackStepAdd={handleTrackStepAdd}
            onTrackStepDelete={handleTrackStepDelete}
            onTrackStepSelect={handleTrackStepSelect}
            selectedTrackStep={session.builder.ui.selectedTrackStep}
          />
        </div>

        {/* Right Panel - Config Panel (60%) */}
        <div className="flex-1">
          {session.builder.ui.selectedTrigger ? (
            <TriggerConfigPanel
              trigger={session.builder.workflow.trigger}
              onTriggerChange={handleTriggerChange}
            />
          ) : (
            <StepConfigPanelV2
              step={selectedStep}
              allSteps={session.builder.workflow.steps}
              variables={allVariables}
              statuses={session.builder.workflow.statuses}
              onStepUpdate={handleStepUpdate}
              onAddVariable={handleAddVariable}
            />
          )}
        </div>
      </div>
    </div>
  )
}
