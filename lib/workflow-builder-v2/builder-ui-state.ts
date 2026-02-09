import type { WorkflowStepV2 } from "./types"
import type { TrackStepSelection } from "./workflow-operations"

export interface BuilderUiState {
  selectedStepId: string | null
  selectedTrigger: boolean
  selectedTrackStep: TrackStepSelection | null
  showJsonExport: boolean
}

export type BuilderUiAction =
  | { type: "select_trigger" }
  | { type: "select_step"; stepId: string }
  | { type: "select_track_step"; selection: TrackStepSelection }
  | { type: "step_added"; stepId: string }
  | { type: "step_duplicated"; stepId: string }
  | { type: "step_deleted"; stepId: string; fallbackStepId: string | null }
  | { type: "track_step_added"; selection: TrackStepSelection }
  | { type: "track_step_deleted"; selection: TrackStepSelection }
  | { type: "toggle_json_export" }

export function createInitialBuilderUiState(steps: WorkflowStepV2[]): BuilderUiState {
  return {
    selectedStepId: steps[0]?.id ?? null,
    selectedTrigger: false,
    selectedTrackStep: null,
    showJsonExport: false,
  }
}

export function builderUiReducer(
  state: BuilderUiState,
  action: BuilderUiAction
): BuilderUiState {
  switch (action.type) {
    case "select_trigger":
      return {
        ...state,
        selectedTrigger: true,
        selectedStepId: null,
        selectedTrackStep: null,
      }
    case "select_step":
      return {
        ...state,
        selectedTrigger: false,
        selectedStepId: action.stepId,
        selectedTrackStep: null,
      }
    case "select_track_step":
      return {
        ...state,
        selectedTrigger: false,
        selectedStepId: null,
        selectedTrackStep: action.selection,
      }
    case "step_added":
    case "step_duplicated":
      return {
        ...state,
        selectedTrigger: false,
        selectedStepId: action.stepId,
        selectedTrackStep: null,
      }
    case "step_deleted": {
      const deletedSelectedMainStep = state.selectedStepId === action.stepId
      const deletedBranchOfSelectedTrackStep =
        state.selectedTrackStep?.branchId === action.stepId

      if (!deletedSelectedMainStep && !deletedBranchOfSelectedTrackStep) {
        return state
      }

      return {
        ...state,
        selectedTrigger: false,
        selectedStepId: action.fallbackStepId,
        selectedTrackStep: null,
      }
    }
    case "track_step_added":
      return {
        ...state,
        selectedTrigger: false,
        selectedStepId: null,
        selectedTrackStep: action.selection,
      }
    case "track_step_deleted": {
      const selectedTrack = state.selectedTrackStep
      if (
        !selectedTrack ||
        selectedTrack.branchId !== action.selection.branchId ||
        selectedTrack.trackId !== action.selection.trackId ||
        selectedTrack.stepId !== action.selection.stepId
      ) {
        return state
      }

      return {
        ...state,
        selectedTrigger: false,
        selectedStepId: action.selection.branchId,
        selectedTrackStep: null,
      }
    }
    case "toggle_json_export":
      return {
        ...state,
        showJsonExport: !state.showJsonExport,
      }
    default:
      return state
  }
}
