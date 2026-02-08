import { describe, expect, it } from "vitest"

import { createDefaultStep, stepRegistry, stepTypeList } from "@/lib/workflow-builder/step-registry"
import type { StepType } from "@/types"

describe("lib/workflow-builder/step-registry", () => {
  it("exposes every registered step type in the list", () => {
    const typesFromRegistry = Object.keys(stepRegistry).sort()
    const typesFromList = stepTypeList.map((step) => step.type).sort()

    expect(typesFromList).toEqual(typesFromRegistry)
  })

  it("creates a default step with an id and label for each step type", () => {
    const types = Object.keys(stepRegistry) as StepType[]

    for (const type of types) {
      const step = createDefaultStep(type)
      expect(step.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
      expect(step.type).toBe(type)
      expect(step.label).toBe(stepRegistry[type].label)
      expect(step.config).toBeTruthy()
    }
  })

  it("returns a new config object each time", () => {
    const first = createDefaultStep("assign_task")
    const second = createDefaultStep("assign_task")

    expect(first.config).not.toBe(second.config)
  })
})
