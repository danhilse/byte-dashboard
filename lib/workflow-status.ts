import type { DefinitionStatus } from "@/types"
import { fallbackWorkflowStatuses } from "@/lib/status-config"

export function sortDefinitionStatuses(
  statuses?: DefinitionStatus[] | null
): DefinitionStatus[] {
  if (!statuses?.length) return []
  return [...statuses].sort((a, b) => a.order - b.order)
}

export function getAllowedWorkflowStatuses(
  definitionStatuses?: DefinitionStatus[] | null
): string[] {
  const sorted = sortDefinitionStatuses(definitionStatuses)
  if (sorted.length) {
    return sorted.map((status) => status.id)
  }
  return [...fallbackWorkflowStatuses]
}

export function isAllowedWorkflowStatus(
  status: string,
  definitionStatuses?: DefinitionStatus[] | null
): boolean {
  return getAllowedWorkflowStatuses(definitionStatuses).includes(status)
}

export function resolveInitialWorkflowStatus(
  definitionStatuses: DefinitionStatus[] | null | undefined,
  fallbackStatus: string
): string {
  return sortDefinitionStatuses(definitionStatuses)[0]?.id ?? fallbackStatus
}
