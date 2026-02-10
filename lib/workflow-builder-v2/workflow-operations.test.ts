import { describe, expect, it } from "vitest"
import {
  addTrackStepToBranch,
  cloneBranchStep,
  cloneWorkflowAction,
  cloneStandardStep,
  createEmptyBranchStep,
  createEmptyStandardStep,
  duplicateActionInList,
  duplicateStepInList,
  findSelectedStep,
  removeTrackStepFromBranch,
  type TrackStepSelection,
  updateWorkflowStep,
} from "./workflow-operations"
import type { WorkflowStepV2 } from "./types"

describe("lib/workflow-builder-v2/workflow-operations", () => {
  it("duplicates a standard step with new ids", () => {
    const original = createEmptyStandardStep("Review")
    original.actions = [
      {
        type: "send_email",
        id: "action-1",
        config: { to: "var-contact.email", subject: "A", body: "B" },
      },
    ]

    const duplicated = cloneStandardStep(original)

    expect(duplicated.id).not.toBe(original.id)
    expect(duplicated.name).toBe("Review (Copy)")
    expect(duplicated.actions[0].id).not.toBe(original.actions[0].id)
  })

  it("duplicates a branch step and deep-clones nested track steps", () => {
    const branch = createEmptyBranchStep("Decision")
    branch.tracks[0].steps = [createEmptyStandardStep("Track A Step")]

    const duplicated = cloneBranchStep(branch)

    expect(duplicated.id).not.toBe(branch.id)
    expect(duplicated.tracks[0].id).not.toBe(branch.tracks[0].id)
    expect(duplicated.tracks[0].steps[0].id).not.toBe(branch.tracks[0].steps[0].id)
  })

  it("updates selected track step in nested branch", () => {
    const branch = createEmptyBranchStep("Decision")
    const trackStep = createEmptyStandardStep("Track Step")
    branch.tracks[0].steps = [trackStep]

    const steps: WorkflowStepV2[] = [branch]
    const selection: TrackStepSelection = {
      branchId: branch.id,
      trackId: branch.tracks[0].id,
      stepId: trackStep.id,
    }

    const updated = updateWorkflowStep(
      steps,
      { ...trackStep, name: "Updated Track Step" },
      selection
    )

    const result = findSelectedStep(updated, null, selection)
    expect(result?.name).toBe("Updated Track Step")
  })

  it("duplicates a step in list and inserts right after original", () => {
    const first = createEmptyStandardStep("First")
    const second = createEmptyStandardStep("Second")

    const { nextSteps, duplicatedStepId } = duplicateStepInList([first, second], first.id)

    expect(duplicatedStepId).toBeTruthy()
    expect(nextSteps).toHaveLength(3)
    expect(nextSteps[1].name).toBe("First (Copy)")
  })

  it("duplicates an action in list and inserts right after original", () => {
    const firstAction = cloneWorkflowAction({
      type: "send_email",
      id: "action-1",
      config: { to: "var-contact.email", subject: "Hello", body: "World" },
    })
    const secondAction = cloneWorkflowAction({
      type: "update_status",
      id: "action-2",
      config: { status: "in_progress" },
    })

    const { nextActions, duplicatedActionId } = duplicateActionInList(
      [firstAction, secondAction],
      firstAction.id
    )

    expect(duplicatedActionId).toBeTruthy()
    expect(nextActions).toHaveLength(3)
    expect(nextActions[1].type).toBe(firstAction.type)
    expect(nextActions[1].id).not.toBe(firstAction.id)
    expect(nextActions[2].id).toBe(secondAction.id)
  })

  it("adds and removes track step from branch", () => {
    const branch = createEmptyBranchStep("Decision")
    const added = createEmptyStandardStep("Nested")

    const withTrackStep = addTrackStepToBranch([branch], branch.id, branch.tracks[0].id, added)
    expect((withTrackStep[0] as typeof branch).tracks[0].steps).toHaveLength(1)

    const withoutTrackStep = removeTrackStepFromBranch(
      withTrackStep,
      branch.id,
      branch.tracks[0].id,
      added.id
    )
    expect((withoutTrackStep[0] as typeof branch).tracks[0].steps).toHaveLength(0)
  })
})
