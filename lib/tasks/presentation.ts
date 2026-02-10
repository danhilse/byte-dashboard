import type { Task } from "@/types"

type BadgeVariant = "default" | "secondary" | "outline" | "destructive"

const TASK_LINK_PROTOCOL = /^https?:\/\//i

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function normalizeTaskLinks(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seen = new Set<string>()
  const links: string[] = []

  for (const entry of value) {
    if (typeof entry !== "string") continue
    const trimmed = entry.trim()
    if (!trimmed) continue
    if (seen.has(trimmed)) continue
    seen.add(trimmed)
    links.push(trimmed)
  }

  return links
}

export function getTaskLinks(metadata: unknown): string[] {
  if (!isRecord(metadata)) {
    return []
  }

  return normalizeTaskLinks(metadata.links)
}

export function normalizeTaskMetadata(metadata: unknown): Record<string, unknown> {
  const base = isRecord(metadata) ? { ...metadata } : {}
  const links = normalizeTaskLinks(base.links)

  if (links.length > 0) {
    base.links = links
  } else {
    delete base.links
  }

  return base
}

export function toTaskLinkHref(link: string): string {
  const trimmed = link.trim()
  if (!trimmed) return trimmed
  if (TASK_LINK_PROTOCOL.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function isApprovalTaskDecided(
  task: Pick<Task, "taskType" | "status" | "outcome">
): boolean {
  if (task.taskType !== "approval") {
    return false
  }

  return task.status === "done" || task.outcome === "approved" || task.outcome === "rejected"
}

export function getTaskStatusDisplay(
  task: Pick<Task, "taskType" | "status" | "outcome">,
  fallback: { label: string; variant: BadgeVariant }
): { label: string; variant: BadgeVariant } {
  if (task.taskType !== "approval") {
    return fallback
  }

  if (isApprovalTaskDecided(task)) {
    return { label: "Decided", variant: "default" }
  }

  return { label: "Needs Review", variant: "secondary" }
}
