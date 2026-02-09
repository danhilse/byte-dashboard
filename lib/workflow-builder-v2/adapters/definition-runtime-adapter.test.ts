import { describe, expect, it } from "vitest"

import {
  AUTHORING_STORAGE_KEY,
  AuthoringCompileError,
  compileAuthoringToRuntime,
  definitionPhasesFromAuthoring,
  fromDefinitionToAuthoring,
} from "@/lib/workflow-builder-v2/adapters/definition-runtime-adapter"
import type { WorkflowDefinitionV2 } from "@/lib/workflow-builder-v2/types"

function buildWorkflow(overrides: Partial<WorkflowDefinitionV2> = {}): WorkflowDefinitionV2 {
  const now = "2026-02-09T00:00:00.000Z"
  return {
    id: "wf_1",
    name: "Test Workflow",
    trigger: { type: "manual" },
    contactRequired: true,
    phases: [],
    statuses: [
      { id: "draft", label: "Draft", order: 0 },
      { id: "approved", label: "Approved", order: 1 },
    ],
    variables: [],
    steps: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe("definition-runtime-adapter", () => {
  it("compiles a supported standard step into runtime steps", () => {
    const workflow = buildWorkflow({
      steps: [
        {
          id: "step_a",
          name: "Review",
          actions: [
            {
              type: "create_task",
              id: "task_a",
              config: {
                title: "Review {{contact.firstName}}",
                taskType: "standard",
                assignTo: { type: "role", role: "manager" },
                priority: "medium",
                dueDays: 3,
              },
            },
            {
              type: "send_email",
              id: "email_a",
              config: {
                to: "var-contact.email",
                subject: "Thanks",
                body: "We received your submission.",
              },
            },
          ],
          advancementCondition: {
            type: "when_task_completed",
            config: { taskActionId: "task_a" },
          },
        },
      ],
    })

    const runtimeSteps = compileAuthoringToRuntime(workflow)

    expect(runtimeSteps.map((step) => step.type)).toEqual([
      "trigger",
      "assign_task",
      "send_email",
      "wait_for_task",
      "trigger",
    ])
    const sendEmail = runtimeSteps.find((step) => step.type === "send_email")
    expect(sendEmail).toMatchObject({
      config: { to: "{{contact.email}}" },
    })
  })

  it("compiles branch tracks and skips the non-selected track", () => {
    const workflow = buildWorkflow({
      steps: [
        {
          id: "step_before",
          name: "Before",
          actions: [
            {
              type: "send_email",
              id: "email_before",
              config: {
                to: "var-contact.email",
                subject: "Before",
                body: "Before",
              },
            },
          ],
          advancementCondition: { type: "automatic" },
        },
        {
          id: "branch_1",
          name: "Decision",
          stepType: "branch",
          condition: {
            variableRef: "var-contact.email",
            operator: "equals",
            compareValue: "yes@example.com",
          },
          tracks: [
            {
              id: "track_a",
              label: "Yes",
              steps: [
                {
                  id: "track_a_step",
                  name: "A",
                  actions: [
                    {
                      type: "update_status",
                      id: "status_a",
                      config: { status: "approved" },
                    },
                  ],
                  advancementCondition: { type: "automatic" },
                },
              ],
            },
            {
              id: "track_b",
              label: "No",
              steps: [
                {
                  id: "track_b_step",
                  name: "B",
                  actions: [
                    {
                      type: "send_email",
                      id: "email_b",
                      config: {
                        to: "var-contact.email",
                        subject: "No",
                        body: "No",
                      },
                    },
                  ],
                  advancementCondition: { type: "automatic" },
                },
              ],
            },
          ],
          actions: [],
          advancementCondition: { type: "automatic" },
        },
        {
          id: "step_after",
          name: "After",
          actions: [
            {
              type: "send_email",
              id: "email_after",
              config: {
                to: "var-contact.email",
                subject: "After",
                body: "After",
              },
            },
          ],
          advancementCondition: { type: "automatic" },
        },
      ],
    })

    const runtimeSteps = compileAuthoringToRuntime(workflow)
    const mergeStep = runtimeSteps.find((step) => step.label === "Decision: Merge")

    expect(mergeStep?.type).toBe("condition")
    if (mergeStep?.type === "condition") {
      expect(mergeStep.config.branches[0].gotoStepId).toBe("email_after")
    }
  })

  it("throws compile errors for unsupported action types", () => {
    const workflow = buildWorkflow({
      steps: [
        {
          id: "step_a",
          name: "Unsupported",
          actions: [
            {
              type: "set_variable",
              id: "set_1",
              config: { variableId: "custom_1", value: "x" },
            },
          ],
          advancementCondition: { type: "automatic" },
        },
      ],
    })

    expect(() => compileAuthoringToRuntime(workflow)).toThrow(AuthoringCompileError)
  })

  it("throws compile errors when statuses are missing", () => {
    const workflow = buildWorkflow({
      statuses: [],
      steps: [
        {
          id: "step_a",
          name: "Any",
          actions: [],
          advancementCondition: { type: "automatic" },
        },
      ],
    })

    expect(() => compileAuthoringToRuntime(workflow)).toThrow(AuthoringCompileError)
  })

  it("converts duration advancement into runtime delay steps", () => {
    const workflow = buildWorkflow({
      steps: [
        {
          id: "step_a",
          name: "Wait",
          actions: [],
          advancementCondition: {
            type: "when_duration_passes",
            config: { duration: 2, unit: "weeks" },
          },
        },
      ],
    })

    const runtimeSteps = compileAuthoringToRuntime(workflow)
    const delayStep = runtimeSteps.find((step) => step.type === "delay")

    expect(delayStep).toMatchObject({
      type: "delay",
      config: { duration: 14, unit: "days" },
    })
  })

  it("throws compile errors for unsupported variable references", () => {
    const workflow = buildWorkflow({
      steps: [
        {
          id: "step_a",
          name: "Notify",
          actions: [
            {
              type: "send_email",
              id: "email_1",
              config: {
                to: "var-custom-1",
                subject: "Subject",
                body: "Body",
              },
            },
          ],
          advancementCondition: { type: "automatic" },
        },
      ],
    })

    expect(() => compileAuthoringToRuntime(workflow)).toThrow(AuthoringCompileError)
  })

  it("compiles branch conditions with templated refs and not_equals operator", () => {
    const workflow = buildWorkflow({
      steps: [
        {
          id: "branch_1",
          name: "Check Email",
          stepType: "branch",
          condition: {
            variableRef: "{{contact.email}}",
            operator: "not_equals",
            compareValue: "allowed@example.com",
          },
          tracks: [
            {
              id: "track_a",
              label: "Default",
              steps: [
                {
                  id: "track_a_step",
                  name: "Track A Step",
                  actions: [
                    {
                      type: "send_email",
                      id: "email_a",
                      config: {
                        to: "var-contact.email",
                        subject: "A",
                        body: "A",
                      },
                    },
                  ],
                  advancementCondition: { type: "automatic" },
                },
              ],
            },
            {
              id: "track_b",
              label: "Match",
              steps: [
                {
                  id: "track_b_step",
                  name: "Track B Step",
                  actions: [
                    {
                      type: "send_email",
                      id: "email_b",
                      config: {
                        to: "var-contact.email",
                        subject: "B",
                        body: "B",
                      },
                    },
                  ],
                  advancementCondition: { type: "automatic" },
                },
              ],
            },
          ],
          actions: [],
          advancementCondition: { type: "automatic" },
        },
      ],
    })

    const runtimeSteps = compileAuthoringToRuntime(workflow)
    const branch = runtimeSteps.find((step) => step.type === "condition")

    expect(branch?.type).toBe("condition")
    if (branch?.type === "condition") {
      expect(branch.config.field).toBe("{{contact.email}}")
      expect(branch.config.branches[0].gotoStepId).toBe("email_b")
      expect(branch.config.defaultGotoStepId).toBe("email_a")
    }
  })

  it("throws compile errors when branch variable ref is empty", () => {
    const workflow = buildWorkflow({
      steps: [
        {
          id: "branch_1",
          name: "Bad Branch",
          stepType: "branch",
          condition: {
            variableRef: "",
            operator: "equals",
            compareValue: "ok",
          },
          tracks: [
            {
              id: "track_a",
              label: "A",
              steps: [
                {
                  id: "track_a_step",
                  name: "A Step",
                  actions: [],
                  advancementCondition: { type: "automatic" },
                },
              ],
            },
            {
              id: "track_b",
              label: "B",
              steps: [
                {
                  id: "track_b_step",
                  name: "B Step",
                  actions: [],
                  advancementCondition: { type: "automatic" },
                },
              ],
            },
          ],
          actions: [],
          advancementCondition: { type: "automatic" },
        },
      ],
    })

    expect(() => compileAuthoringToRuntime(workflow)).toThrow(AuthoringCompileError)
  })

  it("defensively rejects branch compareValue shape changes during compile", () => {
    let compareReads = 0
    const condition = {
      variableRef: "var-contact.email",
      operator: "equals",
      get compareValue() {
        compareReads += 1
        return compareReads === 1 ? "ok" : 42
      },
    }

    const workflow = buildWorkflow({
      steps: [
        {
          id: "branch_1",
          name: "Unstable Branch",
          stepType: "branch",
          condition: condition as never,
          tracks: [
            {
              id: "track_a",
              label: "A",
              steps: [
                {
                  id: "track_a_step",
                  name: "A Step",
                  actions: [],
                  advancementCondition: { type: "automatic" },
                },
              ],
            },
            {
              id: "track_b",
              label: "B",
              steps: [
                {
                  id: "track_b_step",
                  name: "B Step",
                  actions: [],
                  advancementCondition: { type: "automatic" },
                },
              ],
            },
          ],
          actions: [],
          advancementCondition: { type: "automatic" },
        },
      ],
    })

    expect(() => compileAuthoringToRuntime(workflow)).toThrow(AuthoringCompileError)
  })

  it("defensively rejects branch operator shape changes during compile", () => {
    let operatorReads = 0
    const condition = {
      variableRef: "var-contact.email",
      compareValue: "ok",
      get operator() {
        operatorReads += 1
        return operatorReads === 1 ? "equals" : "contains"
      },
    }

    const workflow = buildWorkflow({
      steps: [
        {
          id: "branch_1",
          name: "Unstable Operator Branch",
          stepType: "branch",
          condition: condition as never,
          tracks: [
            {
              id: "track_a",
              label: "A",
              steps: [
                {
                  id: "track_a_step",
                  name: "A Step",
                  actions: [],
                  advancementCondition: { type: "automatic" },
                },
              ],
            },
            {
              id: "track_b",
              label: "B",
              steps: [
                {
                  id: "track_b_step",
                  name: "B Step",
                  actions: [],
                  advancementCondition: { type: "automatic" },
                },
              ],
            },
          ],
          actions: [],
          advancementCondition: { type: "automatic" },
        },
      ],
    })

    expect(() => compileAuthoringToRuntime(workflow)).toThrow(AuthoringCompileError)
  })

  it("hydrates authoring from persisted variables payload", () => {
    const definition = {
      id: "def_1",
      name: "Persisted",
      description: null,
      statuses: [{ id: "draft", label: "Draft", order: 0 }],
      phases: [],
      steps: [],
      variables: {
        [AUTHORING_STORAGE_KEY]: {
          schemaVersion: 1,
          workflow: {
            trigger: { type: "contact_status", statusValue: "active" },
            contactRequired: false,
            steps: [
              {
                id: "step_1",
                name: "Persisted Step",
                actions: [],
                advancementCondition: { type: "automatic" },
              },
            ],
            phases: [],
            variables: [],
          },
        },
      },
      createdAt: "2026-02-09T00:00:00.000Z",
      updatedAt: "2026-02-09T00:00:00.000Z",
    }

    const authoring = fromDefinitionToAuthoring(definition)

    expect(authoring.trigger).toEqual({
      type: "contact_status",
      statusValue: "active",
    })
    expect(authoring.contactRequired).toBe(false)
    expect(authoring.steps).toHaveLength(1)
    expect(authoring.steps[0].id).toBe("step_1")
  })

  it("maps authoring phases to persisted definition phases", () => {
    const authoring = buildWorkflow({
      phases: [
        { id: "phase_review", name: "Review", order: 2, color: "#3b82f6" },
        { id: "phase_intake", name: "Intake", order: 0, color: "#64748b" },
      ],
    })

    expect(definitionPhasesFromAuthoring(authoring)).toEqual([
      { id: "phase_review", label: "Review", order: 2 },
      { id: "phase_intake", label: "Intake", order: 0 },
    ])
  })
})
