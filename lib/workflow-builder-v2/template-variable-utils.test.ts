import { describe, expect, it } from "vitest"

import { buildCustomVariableTokenKeyMap, getCustomVariableRuntimeKeys } from "./template-variable-utils"
import type { WorkflowVariable } from "./types"

function customVariable(
  id: string,
  name: string,
  value?: string
): WorkflowVariable {
  return {
    id,
    name,
    type: "custom",
    source: value === undefined ? { type: "custom" } : { type: "custom", value },
    dataType: "text",
  }
}

describe("template-variable-utils", () => {
  it("builds friendly keys from custom variable names", () => {
    const keyMap = buildCustomVariableTokenKeyMap([
      customVariable("var-custom-1", "Test Variable"),
      customVariable("var-custom-2", "Score"),
    ])

    expect(keyMap.get("var-custom-1")).toBe("test_variable")
    expect(keyMap.get("var-custom-2")).toBe("score")
  })

  it("deduplicates friendly keys when names collide", () => {
    const keyMap = buildCustomVariableTokenKeyMap([
      customVariable("var-custom-1", "Status"),
      customVariable("var-custom-2", "status"),
    ])

    expect(keyMap.get("var-custom-1")).toBe("status")
    expect(keyMap.get("var-custom-2")).toBe("status_2")
  })

  it("returns both legacy and friendly runtime keys", () => {
    const keyMap = buildCustomVariableTokenKeyMap([
      customVariable("var-custom-1", "Score"),
    ])

    expect(getCustomVariableRuntimeKeys("var-custom-1", keyMap)).toEqual([
      "custom.var-custom-1",
      "custom.score",
    ])
  })
})
