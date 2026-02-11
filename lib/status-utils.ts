/**
 * Utility functions for status handling and badge variants
 */

export type BadgeVariant = "default" | "secondary" | "outline" | "destructive"

const BLOCKED_STATUS_KEYWORDS = ["error", "failed", "timeout", "cancel", "reject", "hold"]
const COMPLETED_STATUS_KEYWORDS = ["complete", "approved", "done", "success", "closed"]
const ATTENTION_STATUS_KEYWORDS = ["pending", "review", "draft"]

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase().replace(/\s+/g, "_")
}

function includesStatusKeyword(status: string, keywords: string[]): boolean {
  return keywords.some((keyword) => status.includes(keyword))
}

/**
 * Determines the appropriate badge variant based on workflow status
 */
export function getWorkflowStatusBadgeVariant(status: string): BadgeVariant {
  const normalized = normalizeStatus(status)
  if (includesStatusKeyword(normalized, BLOCKED_STATUS_KEYWORDS)) return "destructive"
  if (includesStatusKeyword(normalized, COMPLETED_STATUS_KEYWORDS)) return "default"
  if (includesStatusKeyword(normalized, ATTENTION_STATUS_KEYWORDS)) return "secondary"
  return "outline"
}
