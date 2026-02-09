import { describe, expect, it } from "vitest"
import type { WorkflowDefinitionV2 } from "./types"
import {
  builderStateReducer,
  createInitialBuilderState,
} from "./builder-state"
import {
  createEmptyBranchStep,
  createEmptyStandardStep,
} from "./workflow-operations"

function createBaseWorkflow(
  steps: WorkflowDefinitionV2["steps"] = [createEmptyStandardStep("Start")]
): WorkflowDefinitionV2 {
  const now = new Date().toISOString()

  return {
    id: "wf-test",
    name: "Test Workflow",
    trigger: { type: "manual" },
    contactRequired: true,
    steps,
    phases: [],
    statuses: [],
    variables: [],
    createdAt: now,
    updatedAt: now,
  }
}

describe("lib/workflow-builder-v2/builder-state", () => {
  it("initializes workflow and ui together", () => {
    const workflow = createBaseWorkflow()
    const state = createInitialBuilderState(workflow)

    expect(state.workflow.id).toBe(workflow.id)
    expect(state.ui.selectedStepId).toBe(workflow.steps[0].id)
  })

  it("adds a step and selects it", () => {
    const workflow = createBaseWorkflow()
    const state = createInitialBuilderState(workflow)
    const newStep = createEmptyStandardStep("New Step")

    const next = builderStateReducer(state, { type: "step_added", step: newStep })

    expect(next.workflow.steps).toHaveLength(2)
    expect(next.workflow.steps[1].id).toBe(newStep.id)
    expect(next.ui.selectedStepId).toBe(newStep.id)
  })

  it("deletes selected top-level step and falls back to first remaining step", () => {
    const first = createEmptyStandardStep("First")
    const second = createEmptyStandardStep("Second")
    const workflow = createBaseWorkflow([first, second])
    const state = createInitialBuilderState(workflow)

    const next = builderStateReducer(state, { type: "step_deleted", stepId: first.id })

    expect(next.workflow.steps).toHaveLength(1)
    expect(next.workflow.steps[0].id).toBe(second.id)
    expect(next.ui.selectedStepId).toBe(second.id)
    expect(next.ui.selectedTrackStep).toBeNull()
  })

  it("adds and removes a track step and updates selection accordingly", () => {
    const branch = createEmptyBranchStep("Decision")
    const workflow = createBaseWorkflow([branch])
    const initial = createInitialBuilderState(workflow)
    const trackStep = createEmptyStandardStep("Track Step")

    const added = builderStateReducer(initial, {
      type: "track_step_added",
      branchId: branch.id,
      trackId: branch.tracks[0].id,
      step: trackStep,
    })
    expect(added.ui.selectedTrackStep?.stepId).toBe(trackStep.id)

    const removed = builderStateReducer(added, {
      type: "track_step_deleted",
      branchId: branch.id,
      trackId: branch.tracks[0].id,
      stepId: trackStep.id,
    })
    expect(removed.ui.selectedTrackStep).toBeNull()
    expect(removed.ui.selectedStepId).toBe(branch.id)
  })

  it("updates trigger in workflow data", () => {
    const workflow = createBaseWorkflow()
    const state = createInitialBuilderState(workflow)

    const next = builderStateReducer(state, {
      type: "trigger_changed",
      trigger: { type: "contact_status", statusValue: "in_review" },
    })

    expect(next.workflow.trigger).toEqual({
      type: "contact_status",
      statusValue: "in_review",
    })
  })

  it("replaces workflow from external config updates", () => {
    const workflow = createBaseWorkflow()
    const state = createInitialBuilderState(workflow)
    const replaced = {
      ...workflow,
      name: "Renamed Workflow",
    }

    const next = builderStateReducer(state, {
      type: "workflow_replaced",
      workflow: replaced,
    })

    expect(next.workflow.name).toBe("Renamed Workflow")
  })
})
