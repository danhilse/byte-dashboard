import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { organizationEmailSettings } from "@/lib/db/schema"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_ALLOWED_FROM_EMAILS = 25

export interface OrganizationEmailSenderSettings {
  allowedFromEmails: string[]
}

function sanitizeStoredAllowedFromEmails(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return []
  }

  return [...new Set(
    input
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0)
  )]
}

export function normalizeAllowedFromEmails(
  input: unknown
): { ok: true; allowedFromEmails: string[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) {
    return { ok: false, error: "allowedFromEmails must be an array of email strings" }
  }

  const normalized = sanitizeStoredAllowedFromEmails(input)

  if (normalized.length > MAX_ALLOWED_FROM_EMAILS) {
    return {
      ok: false,
      error: `allowedFromEmails cannot contain more than ${MAX_ALLOWED_FROM_EMAILS} addresses`,
    }
  }

  for (const email of normalized) {
    if (!EMAIL_PATTERN.test(email)) {
      return {
        ok: false,
        error: `Invalid sender email address: ${email}`,
      }
    }
  }

  return { ok: true, allowedFromEmails: normalized }
}

export async function getOrganizationEmailSenderSettings(
  orgId: string
): Promise<OrganizationEmailSenderSettings> {
  const [settings] = await db
    .select({
      allowedFromEmails: organizationEmailSettings.allowedFromEmails,
    })
    .from(organizationEmailSettings)
    .where(eq(organizationEmailSettings.orgId, orgId))

  return {
    allowedFromEmails: sanitizeStoredAllowedFromEmails(settings?.allowedFromEmails),
  }
}

export async function upsertOrganizationEmailSenderSettings(
  orgId: string,
  allowedFromEmails: string[]
): Promise<OrganizationEmailSenderSettings> {
  const now = new Date()

  await db
    .insert(organizationEmailSettings)
    .values({
      orgId,
      allowedFromEmails,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: organizationEmailSettings.orgId,
      set: {
        allowedFromEmails,
        updatedAt: now,
      },
    })

  return { allowedFromEmails }
}

export function isAllowedFromEmail(
  allowedFromEmails: string[],
  candidate: string
): boolean {
  const normalized = candidate.trim().toLowerCase()
  return allowedFromEmails.includes(normalized)
}
