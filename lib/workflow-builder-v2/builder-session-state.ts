import type { WorkflowDefinitionV2 } from "./types"
import {
  builderStateReducer,
  createInitialBuilderState,
  type BuilderEvent,
  type BuilderState,
} from "./builder-state"
import {
  serializeBuilderEventToDefinitionCommand,
  type BuilderCommand,
} from "./builder-command-serializer"

export interface BuilderSessionState {
  builder: BuilderState
  definitionCommandLog: BuilderCommand[]
}

export type BuilderSessionEvent =
  | BuilderEvent
  | { type: "definition_command_log_cleared" }

export function createInitialBuilderSessionState(
  workflow: WorkflowDefinitionV2
): BuilderSessionState {
  return {
    builder: createInitialBuilderState(workflow),
    definitionCommandLog: [],
  }
}

export function builderSessionReducer(
  state: BuilderSessionState,
  event: BuilderSessionEvent
): BuilderSessionState {
  if (event.type === "definition_command_log_cleared") {
    return {
      ...state,
      definitionCommandLog: [],
    }
  }

  const nextBuilderState = builderStateReducer(state.builder, event)
  const command = serializeBuilderEventToDefinitionCommand(
    event,
    state.builder,
    nextBuilderState
  )

  return {
    builder: nextBuilderState,
    definitionCommandLog: command
      ? [...state.definitionCommandLog, command]
      : state.definitionCommandLog,
  }
}
