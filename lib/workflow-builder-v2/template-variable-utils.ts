import type { WorkflowVariable } from "./types"

function normalizeCustomVariableKey(name: string): string {
  const key = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

  return key || "variable"
}

export function buildCustomVariableTokenKeyMap(
  variables: WorkflowVariable[]
): Map<string, string> {
  const keyMap = new Map<string, string>()
  const counts = new Map<string, number>()

  for (const variable of variables) {
    if (variable.source.type !== "custom") continue

    const base = normalizeCustomVariableKey(variable.name)
    const nextCount = (counts.get(base) ?? 0) + 1
    counts.set(base, nextCount)

    const key = nextCount === 1 ? base : `${base}_${nextCount}`
    keyMap.set(variable.id, key)
  }

  return keyMap
}

export function getCustomVariableRuntimeKeys(
  variableId: string,
  keyMap: Map<string, string>
): string[] {
  const keys = [`custom.${variableId}`]
  const friendlyKey = keyMap.get(variableId)

  if (friendlyKey) {
    keys.push(`custom.${friendlyKey}`)
  }

  return [...new Set(keys)]
}
