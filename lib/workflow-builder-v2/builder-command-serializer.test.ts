import { describe, expect, it } from "vitest"
import type { WorkflowDefinitionV2 } from "./types"
import {
  builderStateReducer,
  createInitialBuilderState,
  type BuilderEvent,
} from "./builder-state"
import { serializeBuilderEventToDefinitionCommand } from "./builder-command-serializer"
import {
  createEmptyBranchStep,
  createEmptyStandardStep,
} from "./workflow-operations"

function createBaseWorkflow(steps = [createEmptyStandardStep("Start")]): WorkflowDefinitionV2 {
  const now = new Date().toISOString()
  return {
    id: "wf-command-test",
    name: "Command Test Workflow",
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

function reduceWithCommand(workflow: WorkflowDefinitionV2, event: BuilderEvent) {
  const previous = createInitialBuilderState(workflow)
  const next = builderStateReducer(previous, event)
  const command = serializeBuilderEventToDefinitionCommand(event, previous, next)

  return { previous, next, command }
}

describe("lib/workflow-builder-v2/builder-command-serializer", () => {
  it("serializes step add to definition.add_step", () => {
    const workflow = createBaseWorkflow()
    const step = createEmptyStandardStep("Added Step")

    const { command } = reduceWithCommand(workflow, { type: "step_added", step })

    expect(command).toEqual({
      type: "definition.add_step",
      definitionId: workflow.id,
      definitionVersion: expect.any(String),
      payload: { step },
    })
  })

  it("serializes top-level step update to definition.update_step", () => {
    const workflow = createBaseWorkflow()
    const updated = { ...workflow.steps[0], name: "Updated Name" }

    const { command } = reduceWithCommand(workflow, {
      type: "step_updated",
      step: updated,
    })

    expect(command).toEqual({
      type: "definition.update_step",
      definitionId: workflow.id,
      definitionVersion: expect.any(String),
      payload: { step: updated },
    })
  })

  it("serializes track step update to definition.update_track_step", () => {
    const branch = createEmptyBranchStep("Branch")
    const nested = createEmptyStandardStep("Nested")
    branch.tracks[0].steps = [nested]
    const workflow = createBaseWorkflow([branch])

    const previous = createInitialBuilderState(workflow)
    const selected = builderStateReducer(previous, {
      type: "track_step_selected",
      selection: {
        branchId: branch.id,
        trackId: branch.tracks[0].id,
        stepId: nested.id,
      },
    })
    const updated = { ...nested, name: "Nested Updated" }
    const event: BuilderEvent = { type: "step_updated", step: updated }
    const next = builderStateReducer(selected, event)
    const command = serializeBuilderEventToDefinitionCommand(event, selected, next)

    expect(command).toEqual({
      type: "definition.update_track_step",
      definitionId: workflow.id,
      definitionVersion: expect.any(String),
      payload: {
        branchId: branch.id,
        trackId: branch.tracks[0].id,
        step: updated,
      },
    })
  })

  it("serializes step duplication with discovered duplicated step id", () => {
    const source = createEmptyStandardStep("Source")
    const second = createEmptyStandardStep("Second")
    const workflow = createBaseWorkflow([source, second])

    const { command } = reduceWithCommand(workflow, {
      type: "step_duplicated",
      stepId: source.id,
    })

    expect(command?.type).toBe("definition.duplicate_step")
    expect(command?.definitionId).toBe(workflow.id)
    expect(command?.definitionVersion).toEqual(expect.any(String))
    expect(command?.payload).toMatchObject({
      sourceStepId: source.id,
    })
    expect(command?.payload.duplicatedStepId).toBeTruthy()
  })

  it("does not serialize UI-only events", () => {
    const workflow = createBaseWorkflow()
    const { command } = reduceWithCommand(workflow, { type: "json_export_toggled" })

    expect(command).toBeNull()
  })
})
