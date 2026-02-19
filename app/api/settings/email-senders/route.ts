import { NextResponse } from "next/server"

import { requireApiAuth } from "@/lib/auth/api-guard"
import { withApiRequestLogging } from "@/lib/logging/api-route"
import { parseJsonBody } from "@/lib/validation/api-helpers"
import {
  getOrganizationEmailSenderSettings,
  normalizeAllowedFromEmails,
  upsertOrganizationEmailSenderSettings,
} from "@/lib/settings/email-senders"

async function GETHandler() {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "workflow-definitions.read",
    })

    if (!authResult.ok) {
      return authResult.response
    }

    const { orgId } = authResult.context
    const settings = await getOrganizationEmailSenderSettings(orgId)

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error fetching email sender settings:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch email sender settings",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

async function PATCHHandler(req: Request) {
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

    const normalized = normalizeAllowedFromEmails(parsed.body.allowedFromEmails)
    if (!normalized.ok) {
      return NextResponse.json(
        { error: normalized.error },
        { status: 400 }
      )
    }

    const { orgId } = authResult.context
    const updated = await upsertOrganizationEmailSenderSettings(
      orgId,
      normalized.allowedFromEmails
    )

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating email sender settings:", error)
    return NextResponse.json(
      {
        error: "Failed to update email sender settings",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export const GET = withApiRequestLogging(GETHandler)
export const PATCH = withApiRequestLogging(PATCHHandler)
