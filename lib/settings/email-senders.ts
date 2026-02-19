import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { organizationEmailSettings } from "@/lib/db/schema"
import type {
  OrganizationWorkflowEmailSettings,
  WorkflowEmailTemplate,
} from "@/types/settings"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_ALLOWED_FROM_EMAILS = 25
const MAX_EMAIL_TEMPLATES = 50

interface NormalizeSettingsPatchInput {
  allowedFromEmails?: unknown
  defaultFromEmail?: unknown
  templates?: unknown
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

function sanitizeStoredDefaultFromEmail(input: unknown): string | null {
  if (typeof input !== "string") {
    return null
  }

  const trimmed = input.trim().toLowerCase()
  if (!trimmed) {
    return null
  }
  return trimmed
}

function sanitizeStoredTemplates(input: unknown): WorkflowEmailTemplate[] {
  if (!Array.isArray(input)) {
    return []
  }

  const seenTemplateIds = new Set<string>()
  const templates: WorkflowEmailTemplate[] = []

  for (const item of input) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue
    }

    const candidate = item as Record<string, unknown>
    if (
      typeof candidate.id !== "string" ||
      typeof candidate.name !== "string" ||
      typeof candidate.subject !== "string" ||
      typeof candidate.body !== "string"
    ) {
      continue
    }

    const id = candidate.id.trim()
    const name = candidate.name.trim()
    const subject = candidate.subject.trim()
    const body = candidate.body.trim()

    if (!id || !name || !subject || !body || seenTemplateIds.has(id)) {
      continue
    }

    seenTemplateIds.add(id)
    templates.push({ id, name, subject, body })
  }

  return templates
}

function normalizeAllowedFromEmails(
  input: unknown
): { ok: true; value: string[] } | { ok: false; error: string } {
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

  return { ok: true, value: normalized }
}

function normalizeDefaultFromEmail(
  input: unknown
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (input === null || input === undefined) {
    return { ok: true, value: null }
  }

  if (typeof input !== "string") {
    return { ok: false, error: "defaultFromEmail must be a string or null" }
  }

  const normalized = input.trim().toLowerCase()
  if (!normalized) {
    return { ok: true, value: null }
  }

  if (!EMAIL_PATTERN.test(normalized)) {
    return {
      ok: false,
      error: `Invalid default sender email address: ${normalized}`,
    }
  }

  return { ok: true, value: normalized }
}

function normalizeTemplates(
  input: unknown
): { ok: true; value: WorkflowEmailTemplate[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) {
    return { ok: false, error: "templates must be an array" }
  }

  const templates = sanitizeStoredTemplates(input)
  if (templates.length > MAX_EMAIL_TEMPLATES) {
    return {
      ok: false,
      error: `templates cannot contain more than ${MAX_EMAIL_TEMPLATES} templates`,
    }
  }

  if (templates.length !== input.length) {
    return {
      ok: false,
      error: "Each template must include non-empty id, name, subject, and body",
    }
  }

  return { ok: true, value: templates }
}

export function normalizeOrganizationWorkflowEmailSettingsPatch(
  input: NormalizeSettingsPatchInput,
  current: OrganizationWorkflowEmailSettings
): { ok: true; settings: OrganizationWorkflowEmailSettings } | { ok: false; error: string } {
  const hasAllowedFromEmails = Object.prototype.hasOwnProperty.call(
    input,
    "allowedFromEmails"
  )
  const hasDefaultFromEmail = Object.prototype.hasOwnProperty.call(
    input,
    "defaultFromEmail"
  )
  const hasTemplates = Object.prototype.hasOwnProperty.call(input, "templates")

  const nextAllowedFromEmailsResult = normalizeAllowedFromEmails(
    hasAllowedFromEmails ? input.allowedFromEmails : current.allowedFromEmails
  )
  if (!nextAllowedFromEmailsResult.ok) {
    return nextAllowedFromEmailsResult
  }

  const nextDefaultFromEmailResult = normalizeDefaultFromEmail(
    hasDefaultFromEmail ? input.defaultFromEmail : current.defaultFromEmail
  )
  if (!nextDefaultFromEmailResult.ok) {
    return nextDefaultFromEmailResult
  }

  const nextTemplatesResult = normalizeTemplates(
    hasTemplates ? input.templates : current.templates
  )
  if (!nextTemplatesResult.ok) {
    return nextTemplatesResult
  }

  const nextAllowedFromEmails = nextAllowedFromEmailsResult.value
  const nextDefaultFromEmail = nextDefaultFromEmailResult.value

  if (nextAllowedFromEmails.length > 0 && !nextDefaultFromEmail) {
    return {
      ok: false,
      error: "defaultFromEmail is required when allowedFromEmails is not empty",
    }
  }

  if (
    nextDefaultFromEmail &&
    !nextAllowedFromEmails.includes(nextDefaultFromEmail)
  ) {
    return {
      ok: false,
      error: "defaultFromEmail must be included in allowedFromEmails",
    }
  }

  return {
    ok: true,
    settings: {
      allowedFromEmails: nextAllowedFromEmails,
      defaultFromEmail: nextDefaultFromEmail,
      templates: nextTemplatesResult.value,
    },
  }
}

export async function getOrganizationEmailSenderSettings(
  orgId: string
): Promise<OrganizationWorkflowEmailSettings> {
  const [settings] = await db
    .select({
      allowedFromEmails: organizationEmailSettings.allowedFromEmails,
      defaultFromEmail: organizationEmailSettings.defaultFromEmail,
      templates: organizationEmailSettings.templates,
    })
    .from(organizationEmailSettings)
    .where(eq(organizationEmailSettings.orgId, orgId))

  return {
    allowedFromEmails: sanitizeStoredAllowedFromEmails(settings?.allowedFromEmails),
    defaultFromEmail: sanitizeStoredDefaultFromEmail(settings?.defaultFromEmail),
    templates: sanitizeStoredTemplates(settings?.templates),
  }
}

export async function upsertOrganizationEmailSenderSettings(
  orgId: string,
  settings: OrganizationWorkflowEmailSettings
): Promise<OrganizationWorkflowEmailSettings> {
  const now = new Date()

  await db
    .insert(organizationEmailSettings)
    .values({
      orgId,
      allowedFromEmails: settings.allowedFromEmails,
      defaultFromEmail: settings.defaultFromEmail,
      templates: settings.templates,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: organizationEmailSettings.orgId,
      set: {
        allowedFromEmails: settings.allowedFromEmails,
        defaultFromEmail: settings.defaultFromEmail,
        templates: settings.templates,
        updatedAt: now,
      },
    })

  return settings
}

export function isAllowedFromEmail(
  allowedFromEmails: string[],
  candidate: string
): boolean {
  const normalized = candidate.trim().toLowerCase()
  return allowedFromEmails.includes(normalized)
}
