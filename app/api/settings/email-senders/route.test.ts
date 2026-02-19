/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getOrganizationEmailSenderSettings: vi.fn(),
  upsertOrganizationEmailSenderSettings: vi.fn(),
}))

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}))

vi.mock("@/lib/settings/email-senders", () => ({
  getOrganizationEmailSenderSettings: mocks.getOrganizationEmailSenderSettings,
  normalizeAllowedFromEmails: (input: unknown) => {
    if (!Array.isArray(input)) {
      return { ok: false as const, error: "allowedFromEmails must be an array of email strings" }
    }
    const values = [...new Set(
      input
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0)
    )]

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    for (const value of values) {
      if (!emailPattern.test(value)) {
        return { ok: false as const, error: `Invalid sender email address: ${value}` }
      }
    }

    return { ok: true as const, allowedFromEmails: values }
  },
  upsertOrganizationEmailSenderSettings: mocks.upsertOrganizationEmailSenderSettings,
}))

import { GET, PATCH } from "@/app/api/settings/email-senders/route"

describe("app/api/settings/email-senders/route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 for unauthenticated GET requests", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null, orgRole: null })

    const response = await GET()

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: "Unauthorized" })
  })

  it("returns sender settings for authenticated GET requests", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:admin",
    })
    mocks.getOrganizationEmailSenderSettings.mockResolvedValue({
      allowedFromEmails: ["ops@example.com", "support@example.com"],
    })

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      allowedFromEmails: ["ops@example.com", "support@example.com"],
    })
    expect(mocks.getOrganizationEmailSenderSettings).toHaveBeenCalledWith("org_1")
  })

  it("returns 403 for non-admin PATCH requests", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    })

    const response = await PATCH(
      new Request("http://localhost/api/settings/email-senders", {
        method: "PATCH",
        body: JSON.stringify({ allowedFromEmails: ["ops@example.com"] }),
      })
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: "Forbidden" })
    expect(mocks.upsertOrganizationEmailSenderSettings).not.toHaveBeenCalled()
  })

  it("returns 400 for invalid PATCH payload", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:admin",
    })

    const response = await PATCH(
      new Request("http://localhost/api/settings/email-senders", {
        method: "PATCH",
        body: JSON.stringify({ allowedFromEmails: ["not-an-email"] }),
      })
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: "Invalid sender email address: not-an-email",
    })
    expect(mocks.upsertOrganizationEmailSenderSettings).not.toHaveBeenCalled()
  })

  it("updates sender settings for admin PATCH requests", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:admin",
    })
    mocks.upsertOrganizationEmailSenderSettings.mockResolvedValue({
      allowedFromEmails: ["ops@example.com", "support@example.com"],
    })

    const response = await PATCH(
      new Request("http://localhost/api/settings/email-senders", {
        method: "PATCH",
        body: JSON.stringify({
          allowedFromEmails: ["OPS@example.com", "support@example.com", "ops@example.com"],
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      allowedFromEmails: ["ops@example.com", "support@example.com"],
    })
    expect(mocks.upsertOrganizationEmailSenderSettings).toHaveBeenCalledWith("org_1", [
      "ops@example.com",
      "support@example.com",
    ])
  })
})
