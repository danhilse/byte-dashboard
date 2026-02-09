import type {
  StandardStepV2,
  WorkflowDefinitionV2,
  WorkflowStepV2,
  WorkflowTrigger,
  WorkflowVariable,
} from "./types"
import type {
  BuilderEvent,
  BuilderState,
  DefinitionAuthoringEvent,
} from "./builder-state"
import { isDefinitionAuthoringEvent } from "./builder-state"

interface BaseCommand<TType extends string, TPayload> {
  type: TType
  definitionId: string
  definitionVersion: string
  payload: TPayload
}

export type BuilderCommand =
  | BaseCommand<"definition.replace", { workflow: WorkflowDefinitionV2 }>
  | BaseCommand<"definition.set_trigger", { trigger: WorkflowTrigger }>
  | BaseCommand<"definition.reorder_steps", { stepIds: string[] }>
  | BaseCommand<"definition.add_step", { step: WorkflowStepV2 }>
  | BaseCommand<"definition.update_step", { step: WorkflowStepV2 }>
  | BaseCommand<
      "definition.update_track_step",
      { branchId: string; trackId: string; step: StandardStepV2 }
    >
  | BaseCommand<"definition.delete_step", { stepId: string }>
  | BaseCommand<
      "definition.duplicate_step",
      { sourceStepId: string; duplicatedStepId: string | null; duplicatedStep?: WorkflowStepV2 }
    >
  | BaseCommand<
      "definition.add_track_step",
      { branchId: string; trackId: string; step: StandardStepV2 }
    >
  | BaseCommand<
      "definition.delete_track_step",
      { branchId: string; trackId: string; stepId: string }
    >
  | BaseCommand<"definition.add_variable", { variable: WorkflowVariable }>

export function serializeBuilderEventToDefinitionCommand(
  event: BuilderEvent,
  previous: BuilderState,
  next: BuilderState
): BuilderCommand | null {
  if (!isDefinitionAuthoringEvent(event)) {
    return null
  }

  return serializeAuthoringEventToDefinitionCommand(event, previous, next)
}

export const serializeBuilderEventToCommand =
  serializeBuilderEventToDefinitionCommand

function serializeAuthoringEventToDefinitionCommand(
  event: DefinitionAuthoringEvent,
  previous: BuilderState,
  next: BuilderState
): BuilderCommand {
  const definitionId = next.workflow.id
  const definitionVersion = next.workflow.updatedAt

  switch (event.type) {
    case "workflow_replaced":
      return {
        type: "definition.replace",
        definitionId,
        definitionVersion,
        payload: { workflow: next.workflow },
      }
    case "trigger_changed":
      return {
        type: "definition.set_trigger",
        definitionId,
        definitionVersion,
        payload: { trigger: event.trigger },
      }
    case "steps_reordered":
      return {
        type: "definition.reorder_steps",
        definitionId,
        definitionVersion,
        payload: { stepIds: next.workflow.steps.map((step) => step.id) },
      }
    case "step_added":
      return {
        type: "definition.add_step",
        definitionId,
        definitionVersion,
        payload: { step: event.step },
      }
    case "step_updated":
      if (previous.ui.selectedTrackStep) {
        return {
          type: "definition.update_track_step",
          definitionId,
          definitionVersion,
          payload: {
            branchId: previous.ui.selectedTrackStep.branchId,
            trackId: previous.ui.selectedTrackStep.trackId,
            step: event.step as StandardStepV2,
          },
        }
      }

      return {
        type: "definition.update_step",
        definitionId,
        definitionVersion,
        payload: { step: event.step },
      }
    case "step_deleted":
      return {
        type: "definition.delete_step",
        definitionId,
        definitionVersion,
        payload: { stepId: event.stepId },
      }
    case "step_duplicated": {
      const duplicated = findDuplicatedTopLevelStep(
        previous.workflow.steps,
        next.workflow.steps,
        event.stepId
      )

      return {
        type: "definition.duplicate_step",
        definitionId,
        definitionVersion,
        payload: {
          sourceStepId: event.stepId,
          duplicatedStepId: duplicated?.id ?? null,
          duplicatedStep: duplicated,
        },
      }
    }
    case "track_step_added":
      return {
        type: "definition.add_track_step",
        definitionId,
        definitionVersion,
        payload: {
          branchId: event.branchId,
          trackId: event.trackId,
          step: event.step,
        },
      }
    case "track_step_deleted":
      return {
        type: "definition.delete_track_step",
        definitionId,
        definitionVersion,
        payload: {
          branchId: event.branchId,
          trackId: event.trackId,
          stepId: event.stepId,
        },
      }
    case "variable_added":
      return {
        type: "definition.add_variable",
        definitionId,
        definitionVersion,
        payload: { variable: event.variable },
      }
    default:
      throw new Error(`Unhandled definition authoring event: ${(event as { type: string }).type}`)
  }
}

function findDuplicatedTopLevelStep(
  previousSteps: WorkflowStepV2[],
  nextSteps: WorkflowStepV2[],
  sourceStepId: string
): WorkflowStepV2 | undefined {
  const previousIds = new Set(previousSteps.map((step) => step.id))
  const sourceIndex = nextSteps.findIndex((step) => step.id === sourceStepId)

  if (sourceIndex >= 0) {
    const candidate = nextSteps[sourceIndex + 1]
    if (candidate && !previousIds.has(candidate.id)) {
      return candidate
    }
  }

  return nextSteps.find((step) => !previousIds.has(step.id))
}
