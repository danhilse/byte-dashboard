import { describe, expect, it } from "vitest"
import type { WorkflowDefinitionV2 } from "./types"
import {
  builderSessionReducer,
  createInitialBuilderSessionState,
} from "./builder-session-state"
import { createEmptyStandardStep } from "./workflow-operations"

function createBaseWorkflow(steps = [createEmptyStandardStep("Start")]): WorkflowDefinitionV2 {
  const now = new Date().toISOString()
  return {
    id: "wf-session-test",
    name: "Session Test Workflow",
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

describe("lib/workflow-builder-v2/builder-session-state", () => {
  it("starts with empty definition command log", () => {
    const session = createInitialBuilderSessionState(createBaseWorkflow())
    expect(session.definitionCommandLog).toEqual([])
  })

  it("appends command for data mutation events", () => {
    const initial = createInitialBuilderSessionState(createBaseWorkflow())
    const step = createEmptyStandardStep("Added")

    const next = builderSessionReducer(initial, { type: "step_added", step })

    expect(next.definitionCommandLog).toHaveLength(1)
    expect(next.definitionCommandLog[0]).toEqual({
      type: "definition.add_step",
      definitionId: "wf-session-test",
      definitionVersion: expect.any(String),
      payload: { step },
    })
  })

  it("does not append command for UI-only events", () => {
    const initial = createInitialBuilderSessionState(createBaseWorkflow())

    const next = builderSessionReducer(initial, { type: "trigger_selected" })

    expect(next.definitionCommandLog).toHaveLength(0)
  })

  it("clears log on definition_command_log_cleared", () => {
    const initial = createInitialBuilderSessionState(createBaseWorkflow())
    const step = createEmptyStandardStep("Added")
    const withCommand = builderSessionReducer(initial, { type: "step_added", step })

    const cleared = builderSessionReducer(withCommand, { type: "definition_command_log_cleared" })

    expect(withCommand.definitionCommandLog).toHaveLength(1)
    expect(cleared.definitionCommandLog).toHaveLength(0)
  })
})
