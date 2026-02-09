import type {
  StandardStepV2,
  WorkflowDefinitionV2,
  WorkflowStepV2,
  WorkflowTrigger,
  WorkflowVariable,
} from "./types"
import {
  addTrackStepToBranch,
  duplicateStepInList,
  removeTrackStepFromBranch,
  type TrackStepSelection,
  updateWorkflowStep,
} from "./workflow-operations"
import {
  builderUiReducer,
  createInitialBuilderUiState,
  type BuilderUiState,
} from "./builder-ui-state"

export interface BuilderState {
  workflow: WorkflowDefinitionV2
  ui: BuilderUiState
}

export type BuilderUiEvent =
  | { type: "trigger_selected" }
  | { type: "step_selected"; stepId: string }
  | { type: "track_step_selected"; selection: TrackStepSelection }
  | { type: "json_export_toggled" }

export type DefinitionAuthoringEvent =
  | { type: "workflow_replaced"; workflow: WorkflowDefinitionV2 }
  | { type: "trigger_changed"; trigger: WorkflowTrigger }
  | { type: "steps_reordered"; steps: WorkflowStepV2[] }
  | { type: "step_updated"; step: WorkflowStepV2 }
  | { type: "step_added"; step: WorkflowStepV2 }
  | { type: "step_deleted"; stepId: string }
  | { type: "step_duplicated"; stepId: string }
  | { type: "track_step_added"; branchId: string; trackId: string; step: StandardStepV2 }
  | { type: "track_step_deleted"; branchId: string; trackId: string; stepId: string }
  | { type: "variable_added"; variable: WorkflowVariable }

export type BuilderEvent = DefinitionAuthoringEvent | BuilderUiEvent

export function isDefinitionAuthoringEvent(
  event: BuilderEvent
): event is DefinitionAuthoringEvent {
  switch (event.type) {
    case "workflow_replaced":
    case "trigger_changed":
    case "steps_reordered":
    case "step_updated":
    case "step_added":
    case "step_deleted":
    case "step_duplicated":
    case "track_step_added":
    case "track_step_deleted":
    case "variable_added":
      return true
    case "trigger_selected":
    case "step_selected":
    case "track_step_selected":
    case "json_export_toggled":
      return false
    default:
      return false
  }
}

function withWorkflowUpdate(
  workflow: WorkflowDefinitionV2,
  partial: Partial<WorkflowDefinitionV2>
): WorkflowDefinitionV2 {
  return {
    ...workflow,
    ...partial,
    updatedAt: new Date().toISOString(),
  }
}

export function createInitialBuilderState(
  workflow: WorkflowDefinitionV2
): BuilderState {
  return {
    workflow,
    ui: createInitialBuilderUiState(workflow.steps),
  }
}

export function builderStateReducer(
  state: BuilderState,
  event: BuilderEvent
): BuilderState {
  switch (event.type) {
    case "workflow_replaced":
      return {
        ...state,
        workflow: event.workflow,
      }
    case "trigger_selected":
      return {
        ...state,
        ui: builderUiReducer(state.ui, { type: "select_trigger" }),
      }
    case "step_selected":
      return {
        ...state,
        ui: builderUiReducer(state.ui, { type: "select_step", stepId: event.stepId }),
      }
    case "track_step_selected":
      return {
        ...state,
        ui: builderUiReducer(state.ui, {
          type: "select_track_step",
          selection: event.selection,
        }),
      }
    case "json_export_toggled":
      return {
        ...state,
        ui: builderUiReducer(state.ui, { type: "toggle_json_export" }),
      }
    case "trigger_changed":
      return {
        ...state,
        workflow: withWorkflowUpdate(state.workflow, { trigger: event.trigger }),
      }
    case "steps_reordered":
      return {
        ...state,
        workflow: withWorkflowUpdate(state.workflow, { steps: event.steps }),
      }
    case "step_updated":
      return {
        ...state,
        workflow: withWorkflowUpdate(state.workflow, {
          steps: updateWorkflowStep(
            state.workflow.steps,
            event.step,
            state.ui.selectedTrackStep
          ),
        }),
      }
    case "step_added":
      return {
        workflow: withWorkflowUpdate(state.workflow, {
          steps: [...state.workflow.steps, event.step],
        }),
        ui: builderUiReducer(state.ui, { type: "step_added", stepId: event.step.id }),
      }
    case "step_deleted": {
      const nextSteps = state.workflow.steps.filter((step) => step.id !== event.stepId)

      return {
        workflow: withWorkflowUpdate(state.workflow, { steps: nextSteps }),
        ui: builderUiReducer(state.ui, {
          type: "step_deleted",
          stepId: event.stepId,
          fallbackStepId: nextSteps[0]?.id ?? null,
        }),
      }
    }
    case "step_duplicated": {
      const { nextSteps, duplicatedStepId } = duplicateStepInList(
        state.workflow.steps,
        event.stepId
      )

      if (!duplicatedStepId) {
        return state
      }

      return {
        workflow: withWorkflowUpdate(state.workflow, { steps: nextSteps }),
        ui: builderUiReducer(state.ui, {
          type: "step_duplicated",
          stepId: duplicatedStepId,
        }),
      }
    }
    case "track_step_added":
      return {
        workflow: withWorkflowUpdate(state.workflow, {
          steps: addTrackStepToBranch(
            state.workflow.steps,
            event.branchId,
            event.trackId,
            event.step
          ),
        }),
        ui: builderUiReducer(state.ui, {
          type: "track_step_added",
          selection: {
            branchId: event.branchId,
            trackId: event.trackId,
            stepId: event.step.id,
          },
        }),
      }
    case "track_step_deleted":
      return {
        workflow: withWorkflowUpdate(state.workflow, {
          steps: removeTrackStepFromBranch(
            state.workflow.steps,
            event.branchId,
            event.trackId,
            event.stepId
          ),
        }),
        ui: builderUiReducer(state.ui, {
          type: "track_step_deleted",
          selection: {
            branchId: event.branchId,
            trackId: event.trackId,
            stepId: event.stepId,
          },
        }),
      }
    case "variable_added":
      return {
        ...state,
        workflow: withWorkflowUpdate(state.workflow, {
          variables: [...state.workflow.variables, event.variable],
        }),
      }
    default:
      return state
  }
}
