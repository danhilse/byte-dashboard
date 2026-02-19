import { describe, expect, it } from "vitest"

import {
  isAllowedFromEmail,
  normalizeOrganizationWorkflowEmailSettingsPatch,
} from "@/lib/settings/email-senders"

describe("email sender settings helpers", () => {
  it("normalizes sender settings payload", () => {
    const result = normalizeOrganizationWorkflowEmailSettingsPatch(
      {
        allowedFromEmails: [
          " OPS@example.com ",
          "support@example.com",
          "ops@example.com",
          "",
        ],
        defaultFromEmail: "OPS@example.com",
        templates: [
          {
            id: "template_1",
            name: "Welcome",
            subject: "Welcome {{contact.firstName}}",
            body: "Hello {{contact.firstName}}",
          },
        ],
      },
      {
        allowedFromEmails: [],
        defaultFromEmail: null,
        templates: [],
      }
    )

    expect(result).toEqual({
      ok: true,
      settings: {
        allowedFromEmails: ["ops@example.com", "support@example.com"],
        defaultFromEmail: "ops@example.com",
        templates: [
          {
            id: "template_1",
            name: "Welcome",
            subject: "Welcome {{contact.firstName}}",
            body: "Hello {{contact.firstName}}",
          },
        ],
      },
    })
  })

  it("rejects non-array allowedFromEmails", () => {
    expect(
      normalizeOrganizationWorkflowEmailSettingsPatch(
        { allowedFromEmails: "ops@example.com" },
        {
          allowedFromEmails: [],
          defaultFromEmail: null,
          templates: [],
        }
      )
    ).toEqual({
      ok: false,
      error: "allowedFromEmails must be an array of email strings",
    })
  })

  it("requires defaultFromEmail when allowlist is not empty", () => {
    expect(
      normalizeOrganizationWorkflowEmailSettingsPatch(
        {
          allowedFromEmails: ["ops@example.com"],
          defaultFromEmail: null,
        },
        {
          allowedFromEmails: [],
          defaultFromEmail: null,
          templates: [],
        }
      )
    ).toEqual({
      ok: false,
      error: "defaultFromEmail is required when allowedFromEmails is not empty",
    })
  })

  it("allows clearing defaultFromEmail when allowlist is empty", () => {
    expect(
      normalizeOrganizationWorkflowEmailSettingsPatch(
        {
          allowedFromEmails: [],
          defaultFromEmail: null,
        },
        {
          allowedFromEmails: ["ops@example.com"],
          defaultFromEmail: "ops@example.com",
          templates: [],
        }
      )
    ).toEqual({
      ok: true,
      settings: {
        allowedFromEmails: [],
        defaultFromEmail: null,
        templates: [],
      },
    })
  })

  it("rejects invalid email values", () => {
    expect(
      normalizeOrganizationWorkflowEmailSettingsPatch(
        { allowedFromEmails: ["not-an-email"] },
        {
          allowedFromEmails: [],
          defaultFromEmail: null,
          templates: [],
        }
      )
    ).toEqual({
      ok: false,
      error: "Invalid sender email address: not-an-email",
    })
  })

  it("matches sender addresses case-insensitively", () => {
    expect(
      isAllowedFromEmail(["ops@example.com"], "OPS@example.com")
    ).toBe(true)
    expect(
      isAllowedFromEmail(["ops@example.com"], "nope@example.com")
    ).toBe(false)
  })
})
