import {
  getOrganizationEmailSenderSettings,
  isAllowedFromEmail,
} from "@/lib/settings/email-senders"

/**
 * Email Activities for Temporal Workflows
 *
 * Uses Resend when configured. Falls back to a dev stub when no API key is set.
 */

interface ResendEmailPayload {
  from: string
  to: string[]
  subject: string
  html: string
}

function requireNonEmpty(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error(`Email ${label} is required`)
  }
  return trimmed
}

function getDefaultFromEmail(): string | undefined {
  const from =
    process.env.WORKFLOW_EMAIL_FROM ??
    process.env.RESEND_FROM_EMAIL ??
    "onboarding@resend.dev"
  return from?.trim() || undefined
}

async function sendWithResend(apiKey: string, payload: ResendEmailPayload): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `Resend request failed (${response.status}): ${errorBody || response.statusText}`
    )
  }
}

async function resolveSenderEmail(
  from: string | undefined,
  orgId: string | undefined
): Promise<string> {
  const explicitFrom = from?.trim() || undefined
  const defaultFrom = getDefaultFromEmail() || "onboarding@resend.dev"

  if (!orgId) {
    return explicitFrom ?? defaultFrom
  }

  const settings = await getOrganizationEmailSenderSettings(orgId)

  if (settings.allowedFromEmails.length === 0) {
    return explicitFrom ?? defaultFrom
  }

  if (!explicitFrom) {
    return settings.allowedFromEmails[0]
  }

  if (!isAllowedFromEmail(settings.allowedFromEmails, explicitFrom)) {
    throw new Error(
      `Sender email "${explicitFrom}" is not allowed for organization "${orgId}".`
    )
  }

  return explicitFrom.toLowerCase()
}

/**
 * Sends an email
 *
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param body - Email body (plain text or HTML)
 * @param from - Sender email (optional, defaults to system email)
 * @param orgId - Organization ID (optional, used for sender allowlist enforcement)
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  from?: string,
  orgId?: string
): Promise<void> {
  const resolvedTo = requireNonEmpty(to, '"to"')
  const resolvedSubject = requireNonEmpty(subject, '"subject"')
  const resolvedBody = requireNonEmpty(body, '"body"')
  const resolvedFrom = await resolveSenderEmail(from, orgId)

  console.log(`Activity: Sending email to ${resolvedTo}`)
  console.log(`  Subject: ${resolvedSubject}`)
  console.log(`  From: ${resolvedFrom}`)
  console.log(`  Body preview: ${resolvedBody.substring(0, 100)}...`)

  const resendApiKey = process.env.RESEND_API_KEY?.trim()
  if (!resendApiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "RESEND_API_KEY is required in production to execute send_email workflow actions."
      )
    }

    console.log(
      "Activity: RESEND_API_KEY not configured; skipping external send in non-production mode."
    )
    return
  }

  await sendWithResend(resendApiKey, {
    from: resolvedFrom,
    to: [resolvedTo],
    subject: resolvedSubject,
    html: resolvedBody,
  })

  console.log("Activity: Email sent via Resend")
}

/**
 * Sends a welcome email to an approved applicant
 *
 * @param to - Recipient email
 * @param firstName - Recipient first name
 */
export async function sendWelcomeEmail(
  to: string,
  firstName: string
): Promise<void> {
  const subject = "Welcome to the Team!"
  const body = `
    <h1>Congratulations, ${firstName}!</h1>
    <p>We're excited to welcome you to our team. Your submission has been approved.</p>
    <p>Next steps will be communicated to you shortly.</p>
    <br>
    <p>Best regards,<br>The Team</p>
  `

  await sendEmail(to, subject, body)
}

/**
 * Sends a rejection email to an applicant
 *
 * @param to - Recipient email
 * @param firstName - Recipient first name
 * @param reason - Optional rejection reason
 */
export async function sendRejectionEmail(
  to: string,
  firstName: string,
  reason?: string
): Promise<void> {
  const subject = "Workflow Submission Status Update"
  const body = `
    <h1>Thank you for your submission, ${firstName}</h1>
    <p>We appreciate your interest in joining our team. After careful review, we've decided not to move forward with this submission at this time.</p>
    ${reason ? `<p>Feedback: ${reason}</p>` : ""}
    <p>We encourage you to submit again for future opportunities that match your qualifications.</p>
    <br>
    <p>Best regards,<br>The Team</p>
  `

  await sendEmail(to, subject, body)
}
