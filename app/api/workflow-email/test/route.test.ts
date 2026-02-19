/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  sendEmail: vi.fn(),
}))

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}))

vi.mock("@/lib/activities/email", () => ({
  sendEmail: mocks.sendEmail,
}))

import { POST } from "@/app/api/workflow-email/test/route"

describe("app/api/workflow-email/test/route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 for unauthenticated requests", async () => {
    mocks.auth.mockResolvedValue({ userId: null, orgId: null, orgRole: null })

    const response = await POST(
      new Request("http://localhost/api/workflow-email/test", {
        method: "POST",
        body: JSON.stringify({}),
      })
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: "Unauthorized" })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("returns 403 for non-admin users", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    })

    const response = await POST(
      new Request("http://localhost/api/workflow-email/test", {
        method: "POST",
        body: JSON.stringify({}),
      })
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: "Forbidden" })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("validates required fields", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:admin",
    })

    const response = await POST(
      new Request("http://localhost/api/workflow-email/test", {
        method: "POST",
        body: JSON.stringify({
          to: "",
          subject: "",
          body: "",
        }),
      })
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "to is required" })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("sends test email with rendered sample tokens", async () => {
    mocks.auth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:admin",
    })

    const response = await POST(
      new Request("http://localhost/api/workflow-email/test", {
        method: "POST",
        body: JSON.stringify({
          to: "qa@example.com",
          from: "ops@example.com",
          subject: "Hello {{contact.firstName}}",
          body: "Workflow: {{workflow.name}} / Unknown: {{custom.foo}}",
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      success: true,
      preview: {
        subject: "Hello Taylor",
        body: "Workflow: Application Review / Unknown: [custom.foo]",
      },
    })
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      "qa@example.com",
      "Hello Taylor",
      "Workflow: Application Review / Unknown: [custom.foo]",
      "ops@example.com",
      "org_1"
    )
  })
})
