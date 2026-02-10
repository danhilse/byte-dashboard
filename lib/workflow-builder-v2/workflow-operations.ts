import {
  isBranchStep,
  type BranchStepV2,
  type StandardStepV2,
  type WorkflowAction,
  type WorkflowStepV2,
} from "./types"
import {
  createActionId,
  createBranchId,
  createStepId,
  createTrackId,
} from "./id-utils"

export interface TrackStepSelection {
  branchId: string
  trackId: string
  stepId: string
}

export function createEmptyStandardStep(name = "New Step"): StandardStepV2 {
  return {
    id: createStepId(),
    name,
    actions: [],
    advancementCondition: { type: "automatic" },
  }
}

export function createEmptyBranchStep(name = "New Branch"): BranchStepV2 {
  return {
    id: createBranchId(),
    name,
    stepType: "branch",
    condition: {
      variableRef: "",
      operator: "equals",
      compareValue: "",
    },
    tracks: [
      {
        id: createTrackId("a"),
        label: "Track A",
        steps: [],
      },
      {
        id: createTrackId("b"),
        label: "Track B",
        steps: [],
      },
    ],
    actions: [],
    advancementCondition: { type: "automatic" },
    isExpanded: true,
  }
}

function cloneActionWithNewId(action: WorkflowAction): WorkflowAction {
  return {
    ...action,
    id: createActionId(),
  }
}

export function cloneWorkflowAction(action: WorkflowAction): WorkflowAction {
  return cloneActionWithNewId(action)
}

export function cloneStandardStep(
  step: StandardStepV2,
  options?: { rename?: boolean }
): StandardStepV2 {
  const rename = options?.rename ?? true

  return {
    ...step,
    id: createStepId(),
    name: rename ? `${step.name} (Copy)` : step.name,
    actions: step.actions.map(cloneActionWithNewId),
  }
}

export function cloneBranchStep(
  step: BranchStepV2,
  options?: { rename?: boolean }
): BranchStepV2 {
  const rename = options?.rename ?? true

  return {
    ...step,
    id: createBranchId(),
    name: rename ? `${step.name} (Copy)` : step.name,
    tracks: step.tracks.map((track, index) => ({
      ...track,
      id: createTrackId(index === 0 ? "a" : "b"),
      steps: track.steps.map((trackStep) =>
        cloneStandardStep(trackStep, { rename: false })
      ),
    })) as [BranchStepV2["tracks"][0], BranchStepV2["tracks"][1]],
  }
}

export function cloneWorkflowStep(step: WorkflowStepV2): WorkflowStepV2 {
  return isBranchStep(step) ? cloneBranchStep(step) : cloneStandardStep(step)
}

export function findSelectedStep(
  steps: WorkflowStepV2[],
  selectedStepId: string | null,
  selectedTrackStep: TrackStepSelection | null
): WorkflowStepV2 | undefined {
  const mainStep = steps.find((step) => step.id === selectedStepId)
  if (mainStep) {
    return mainStep
  }

  if (!selectedTrackStep) {
    return undefined
  }

  const selectedBranch = steps.find(
    (step) => step.id === selectedTrackStep.branchId && isBranchStep(step)
  )

  if (!selectedBranch || !isBranchStep(selectedBranch)) {
    return undefined
  }

  const selectedTrack = selectedBranch.tracks.find(
    (track) => track.id === selectedTrackStep.trackId
  )

  return selectedTrack?.steps.find((step) => step.id === selectedTrackStep.stepId)
}

export function updateWorkflowStep(
  steps: WorkflowStepV2[],
  updatedStep: WorkflowStepV2,
  selectedTrackStep: TrackStepSelection | null
): WorkflowStepV2[] {
  if (steps.some((step) => step.id === updatedStep.id)) {
    return steps.map((step) => (step.id === updatedStep.id ? updatedStep : step))
  }

  if (!selectedTrackStep) {
    return steps
  }

  return steps.map((step) => {
    if (step.id !== selectedTrackStep.branchId || !isBranchStep(step)) {
      return step
    }

    return {
      ...step,
      tracks: step.tracks.map((track) => {
        if (track.id !== selectedTrackStep.trackId) {
          return track
        }

        return {
          ...track,
          steps: track.steps.map((trackStep) =>
            trackStep.id === updatedStep.id
              ? (updatedStep as StandardStepV2)
              : trackStep
          ),
        }
      }) as [typeof step.tracks[0], typeof step.tracks[1]],
    }
  })
}

export function duplicateStepInList(
  steps: WorkflowStepV2[],
  stepId: string
): { nextSteps: WorkflowStepV2[]; duplicatedStepId: string | null } {
  const stepIndex = steps.findIndex((step) => step.id === stepId)
  if (stepIndex < 0) {
    return { nextSteps: steps, duplicatedStepId: null }
  }

  const duplicatedStep = cloneWorkflowStep(steps[stepIndex])
  const nextSteps = [
    ...steps.slice(0, stepIndex + 1),
    duplicatedStep,
    ...steps.slice(stepIndex + 1),
  ]

  return { nextSteps, duplicatedStepId: duplicatedStep.id }
}

export function duplicateActionInList(
  actions: WorkflowAction[],
  actionId: string
): { nextActions: WorkflowAction[]; duplicatedActionId: string | null } {
  const actionIndex = actions.findIndex((action) => action.id === actionId)
  if (actionIndex < 0) {
    return { nextActions: actions, duplicatedActionId: null }
  }

  const duplicatedAction = cloneWorkflowAction(actions[actionIndex])
  const nextActions = [
    ...actions.slice(0, actionIndex + 1),
    duplicatedAction,
    ...actions.slice(actionIndex + 1),
  ]

  return { nextActions, duplicatedActionId: duplicatedAction.id }
}

export function addTrackStepToBranch(
  steps: WorkflowStepV2[],
  branchId: string,
  trackId: string,
  newStep: StandardStepV2
): WorkflowStepV2[] {
  return steps.map((step) => {
    if (step.id !== branchId || !isBranchStep(step)) {
      return step
    }

    return {
      ...step,
      tracks: step.tracks.map((track) => {
        if (track.id !== trackId) {
          return track
        }

        return {
          ...track,
          steps: [...track.steps, newStep],
        }
      }) as [typeof step.tracks[0], typeof step.tracks[1]],
    }
  })
}

export function removeTrackStepFromBranch(
  steps: WorkflowStepV2[],
  branchId: string,
  trackId: string,
  stepId: string
): WorkflowStepV2[] {
  return steps.map((step) => {
    if (step.id !== branchId || !isBranchStep(step)) {
      return step
    }

    return {
      ...step,
      tracks: step.tracks.map((track) => {
        if (track.id !== trackId) {
          return track
        }

        return {
          ...track,
          steps: track.steps.filter((trackStep) => trackStep.id !== stepId),
        }
      }) as [typeof step.tracks[0], typeof step.tracks[1]],
    }
  })
}
