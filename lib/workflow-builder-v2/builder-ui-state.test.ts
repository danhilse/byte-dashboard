import { describe, expect, it } from "vitest"
import {
  builderUiReducer,
  createInitialBuilderUiState,
  type BuilderUiState,
} from "./builder-ui-state"
import { createEmptyStandardStep } from "./workflow-operations"

describe("lib/workflow-builder-v2/builder-ui-state", () => {
  it("initializes with the first step selected", () => {
    const first = createEmptyStandardStep("First")
    const second = createEmptyStandardStep("Second")

    const state = createInitialBuilderUiState([first, second])

    expect(state.selectedStepId).toBe(first.id)
    expect(state.selectedTrigger).toBe(false)
    expect(state.selectedTrackStep).toBeNull()
    expect(state.showJsonExport).toBe(false)
  })

  it("switches to trigger selection", () => {
    const base: BuilderUiState = {
      selectedStepId: "step-1",
      selectedTrigger: false,
      selectedTrackStep: null,
      showJsonExport: false,
    }

    const next = builderUiReducer(base, { type: "select_trigger" })

    expect(next.selectedTrigger).toBe(true)
    expect(next.selectedStepId).toBeNull()
    expect(next.selectedTrackStep).toBeNull()
  })

  it("switches to track-step selection", () => {
    const base: BuilderUiState = {
      selectedStepId: "step-1",
      selectedTrigger: false,
      selectedTrackStep: null,
      showJsonExport: false,
    }

    const next = builderUiReducer(base, {
      type: "select_track_step",
      selection: {
        branchId: "branch-1",
        trackId: "track-1",
        stepId: "step-99",
      },
    })

    expect(next.selectedTrigger).toBe(false)
    expect(next.selectedStepId).toBeNull()
    expect(next.selectedTrackStep).toEqual({
      branchId: "branch-1",
      trackId: "track-1",
      stepId: "step-99",
    })
  })

  it("falls back when deleting selected top-level step", () => {
    const base: BuilderUiState = {
      selectedStepId: "step-1",
      selectedTrigger: false,
      selectedTrackStep: null,
      showJsonExport: false,
    }

    const next = builderUiReducer(base, {
      type: "step_deleted",
      stepId: "step-1",
      fallbackStepId: "step-2",
    })

    expect(next.selectedStepId).toBe("step-2")
    expect(next.selectedTrackStep).toBeNull()
    expect(next.selectedTrigger).toBe(false)
  })

  it("selects branch when deleting selected track step", () => {
    const base: BuilderUiState = {
      selectedStepId: null,
      selectedTrigger: false,
      selectedTrackStep: {
        branchId: "branch-1",
        trackId: "track-a",
        stepId: "step-a1",
      },
      showJsonExport: false,
    }

    const next = builderUiReducer(base, {
      type: "track_step_deleted",
      selection: {
        branchId: "branch-1",
        trackId: "track-a",
        stepId: "step-a1",
      },
    })

    expect(next.selectedStepId).toBe("branch-1")
    expect(next.selectedTrackStep).toBeNull()
  })

  it("toggles JSON export panel", () => {
    const base: BuilderUiState = {
      selectedStepId: "step-1",
      selectedTrigger: false,
      selectedTrackStep: null,
      showJsonExport: false,
    }

    const open = builderUiReducer(base, { type: "toggle_json_export" })
    const closed = builderUiReducer(open, { type: "toggle_json_export" })

    expect(open.showJsonExport).toBe(true)
    expect(closed.showJsonExport).toBe(false)
  })
})
