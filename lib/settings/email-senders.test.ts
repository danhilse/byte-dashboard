import { describe, expect, it } from "vitest"

import {
  isAllowedFromEmail,
  normalizeAllowedFromEmails,
} from "@/lib/settings/email-senders"

describe("email sender settings helpers", () => {
  it("normalizes sender emails by trimming, deduplicating, and lowercasing", () => {
    const result = normalizeAllowedFromEmails([
      " OPS@example.com ",
      "support@example.com",
      "ops@example.com",
      "",
    ])

    expect(result).toEqual({
      ok: true,
      allowedFromEmails: ["ops@example.com", "support@example.com"],
    })
  })

  it("rejects non-array input", () => {
    expect(normalizeAllowedFromEmails("ops@example.com")).toEqual({
      ok: false,
      error: "allowedFromEmails must be an array of email strings",
    })
  })

  it("rejects invalid email values", () => {
    expect(normalizeAllowedFromEmails(["not-an-email"])).toEqual({
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
