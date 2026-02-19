import { NextResponse } from "next/server"

import { requireApiAuth } from "@/lib/auth/api-guard"
import { withApiRequestLogging } from "@/lib/logging/api-route"
import { sendEmail } from "@/lib/activities/email"
import { parseJsonBody } from "@/lib/validation/api-helpers"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TEMPLATE_TOKEN_PATTERN = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g

const TEST_TOKEN_VALUES: Record<string, string> = {
  "contact.firstName": "Taylor",
  "contact.lastName": "Johnson",
  "contact.email": "taylor.johnson@example.com",
  "contact.phone": "+1 (555) 123-4567",
  "workflow.name": "Application Review",
  "workflow.status": "in_progress",
}

function renderTemplateForTest(value: string): string {
  return value.replace(TEMPLATE_TOKEN_PATTERN, (_match, token: string) => {
    if (TEST_TOKEN_VALUES[token]) {
      return TEST_TOKEN_VALUES[token]
    }
    return `[${token}]`
  })
}

function parseRequiredString(
  value: unknown,
  field: string
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { ok: false, error: `${field} is required` }
  }
  return { ok: true, value: value.trim() }
}

function parseOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

async function POSTHandler(req: Request) {
  try {
    const authResult = await requireApiAuth({
      requireAdmin: true,
    })

    if (!authResult.ok) {
      return authResult.response
    }

    const parsed = await parseJsonBody(req)
    if ("error" in parsed) {
      return parsed.error
    }

    const parsedTo = parseRequiredString(parsed.body.to, "to")
    if (!parsedTo.ok) {
      return NextResponse.json({ error: parsedTo.error }, { status: 400 })
    }

    if (!EMAIL_PATTERN.test(parsedTo.value)) {
      return NextResponse.json(
        { error: "to must be a valid email address" },
        { status: 400 }
      )
    }

    const parsedSubject = parseRequiredString(parsed.body.subject, "subject")
    if (!parsedSubject.ok) {
      return NextResponse.json({ error: parsedSubject.error }, { status: 400 })
    }

    const parsedBody = parseRequiredString(parsed.body.body, "body")
    if (!parsedBody.ok) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 })
    }

    const from = parseOptionalString(parsed.body.from)
    const renderedSubject = renderTemplateForTest(parsedSubject.value)
    const renderedBody = renderTemplateForTest(parsedBody.value)

    await sendEmail(
      parsedTo.value,
      renderedSubject,
      renderedBody,
      from,
      authResult.context.orgId
    )

    return NextResponse.json({
      success: true,
      preview: {
        subject: renderedSubject,
        body: renderedBody,
      },
    })
  } catch (error) {
    console.error("Error sending test workflow email:", error)
    return NextResponse.json(
      {
        error: "Failed to send test email",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export const POST = withApiRequestLogging(POSTHandler)
