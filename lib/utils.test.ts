import { describe, expect, it } from "vitest"

import { capitalize, cn, formatCurrency, formatStatus, getInitials } from "@/lib/utils"

describe("lib/utils", () => {
  it("builds initials from a full name", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL")
  })

  it("formats currency in USD", () => {
    expect(formatCurrency(1200)).toBe("$1,200")
  })

  it("capitalizes the first character", () => {
    expect(capitalize("workflow")).toBe("Workflow")
  })

  it("formats underscored status values", () => {
    expect(formatStatus("in_progress")).toBe("In Progress")
  })

  it("merges tailwind classes predictably", () => {
    expect(cn("px-2", "px-4", "font-semibold")).toBe("px-4 font-semibold")
  })
})
