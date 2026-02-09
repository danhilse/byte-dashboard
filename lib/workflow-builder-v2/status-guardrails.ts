import type { DefinitionStatus } from "@/types"

export const DEFAULT_DEFINITION_STATUSES: DefinitionStatus[] = [
  { id: "draft", label: "Draft", order: 0, color: "#64748b" },
  { id: "in_review", label: "In Review", order: 1, color: "#3b82f6" },
  { id: "approved", label: "Approved", order: 2, color: "#22c55e" },
  { id: "rejected", label: "Rejected", order: 3, color: "#ef4444" },
]

export interface StatusGuardrailResult {
  ok: true
  statuses: DefinitionStatus[]
}

export interface StatusGuardrailError {
  ok: false
  error: string
}

export function normalizeDefinitionStatuses(
  value: unknown
): StatusGuardrailResult | StatusGuardrailError {
  const sourceStatuses =
    value === undefined || value === null ? DEFAULT_DEFINITION_STATUSES : value

  if (!Array.isArray(sourceStatuses)) {
    return {
      ok: false,
      error: "statuses must be a valid DefinitionStatus[] when provided",
    }
  }

  if (sourceStatuses.length === 0) {
    return {
      ok: false,
      error: "statuses must contain at least one status",
    }
  }

  const normalizedStatuses: DefinitionStatus[] = []
  const seenIds = new Set<string>()
  const seenOrders = new Set<number>()

  for (const status of sourceStatuses) {
    if (!status || typeof status !== "object") {
      return {
        ok: false,
        error: "statuses must be a valid DefinitionStatus[] when provided",
      }
    }

    const candidate = status as Partial<DefinitionStatus>

    const id = candidate.id?.trim()
    const label = candidate.label?.trim()
    const order = candidate.order
    const color = candidate.color?.trim()

    if (!id || !label || typeof order !== "number" || !Number.isInteger(order) || order < 0) {
      return {
        ok: false,
        error: "statuses must be a valid DefinitionStatus[] when provided",
      }
    }

    if (seenIds.has(id)) {
      return {
        ok: false,
        error: `statuses contains duplicate id "${id}"`,
      }
    }

    if (seenOrders.has(order)) {
      return {
        ok: false,
        error: `statuses contains duplicate order "${order}"`,
      }
    }

    seenIds.add(id)
    seenOrders.add(order)
    normalizedStatuses.push({
      id,
      label,
      order,
      color: color && color.length > 0 ? color : undefined,
    })
  }

  return {
    ok: true,
    statuses: normalizedStatuses.sort((a, b) => a.order - b.order),
  }
}
