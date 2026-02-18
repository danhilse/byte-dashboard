import { describe, it, expect } from "vitest"
import {
  validateBodyShape,
  validateEnumField,
  validateDateString,
  validateStringArray,
  validateRequiredString,
  validateNotNull,
  validateOptionalString,
  validateContactPayload,
  validateTaskPayload,
} from "../rules"

// ============================================================================
// Body Shape Validation
// ============================================================================

describe("validateBodyShape", () => {
  it("rejects null", () => {
    expect(validateBodyShape(null)).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "_body" })])
    )
  })

  it("rejects arrays", () => {
    expect(validateBodyShape([])).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "_body" })])
    )
  })

  it("rejects strings", () => {
    expect(validateBodyShape("string")).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "_body" })])
    )
  })

  it("rejects numbers", () => {
    expect(validateBodyShape(42)).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "_body" })])
    )
  })

  it("accepts empty object", () => {
    expect(validateBodyShape({})).toBeNull()
  })

  it("accepts object with data", () => {
    expect(validateBodyShape({ firstName: "John" })).toBeNull()
  })
})

// ============================================================================
// Enum Validation
// ============================================================================

describe("validateEnumField", () => {
  it("rejects invalid contact status", () => {
    const err = validateEnumField("contact", "status", "garbage")
    expect(err).not.toBeNull()
    expect(err!.field).toBe("status")
  })

  it("accepts valid contact status", () => {
    expect(validateEnumField("contact", "status", "active")).toBeNull()
    expect(validateEnumField("contact", "status", "inactive")).toBeNull()
    expect(validateEnumField("contact", "status", "lead")).toBeNull()
  })

  it("rejects invalid task priority", () => {
    const err = validateEnumField("task", "priority", "critical")
    expect(err).not.toBeNull()
    expect(err!.field).toBe("priority")
  })

  it("accepts valid task priority", () => {
    expect(validateEnumField("task", "priority", "low")).toBeNull()
    expect(validateEnumField("task", "priority", "medium")).toBeNull()
    expect(validateEnumField("task", "priority", "high")).toBeNull()
    expect(validateEnumField("task", "priority", "urgent")).toBeNull()
  })

  it("rejects invalid task type", () => {
    const err = validateEnumField("task", "taskType", "review")
    expect(err).not.toBeNull()
    expect(err!.field).toBe("taskType")
  })

  it("accepts valid task type", () => {
    expect(validateEnumField("task", "taskType", "standard")).toBeNull()
    expect(validateEnumField("task", "taskType", "approval")).toBeNull()
  })

  it("returns null for undefined/null values", () => {
    expect(validateEnumField("contact", "status", undefined)).toBeNull()
    expect(validateEnumField("contact", "status", null)).toBeNull()
  })

  it("rejects non-string values", () => {
    const err = validateEnumField("contact", "status", 123)
    expect(err).not.toBeNull()
  })
})

// ============================================================================
// NOT NULL Enforcement
// ============================================================================

describe("validateNotNull", () => {
  it("rejects null", () => {
    const err = validateNotNull("status", null)
    expect(err).not.toBeNull()
    expect(err!.field).toBe("status")
  })

  it("accepts undefined (field not provided)", () => {
    expect(validateNotNull("status", undefined)).toBeNull()
  })

  it("accepts valid values", () => {
    expect(validateNotNull("status", "active")).toBeNull()
    expect(validateNotNull("status", "")).toBeNull()
    expect(validateNotNull("status", 0)).toBeNull()
  })
})

// ============================================================================
// Required String Validation
// ============================================================================

describe("validateRequiredString", () => {
  it("rejects missing value", () => {
    const err = validateRequiredString("firstName", undefined)
    expect(err).not.toBeNull()
    expect(err!.field).toBe("firstName")
  })

  it("rejects null value", () => {
    const err = validateRequiredString("firstName", null)
    expect(err).not.toBeNull()
  })

  it("rejects empty string", () => {
    const err = validateRequiredString("firstName", "")
    expect(err).not.toBeNull()
  })

  it("rejects whitespace-only string", () => {
    const err = validateRequiredString("firstName", "   ")
    expect(err).not.toBeNull()
  })

  it("accepts valid string", () => {
    expect(validateRequiredString("firstName", "John")).toBeNull()
  })

  it("rejects non-string value", () => {
    const err = validateRequiredString("firstName", 123)
    expect(err).not.toBeNull()
  })
})

// ============================================================================
// Date Validation
// ============================================================================

describe("validateDateString", () => {
  it("rejects invalid date string", () => {
    const err = validateDateString("lastContactedAt", "not-a-date")
    expect(err).not.toBeNull()
    expect(err!.field).toBe("lastContactedAt")
  })

  it("accepts valid ISO date", () => {
    expect(validateDateString("lastContactedAt", "2024-01-15T10:00:00Z")).toBeNull()
  })

  it("accepts valid date-only string", () => {
    expect(validateDateString("dueDate", "2024-06-15")).toBeNull()
  })

  it("accepts null (nullable field)", () => {
    expect(validateDateString("lastContactedAt", null)).toBeNull()
  })

  it("accepts undefined (field not provided)", () => {
    expect(validateDateString("lastContactedAt", undefined)).toBeNull()
  })

  it("rejects non-string value", () => {
    const err = validateDateString("dueDate", 12345)
    expect(err).not.toBeNull()
  })
})

// ============================================================================
// String Array Validation
// ============================================================================

describe("validateStringArray", () => {
  it("rejects non-array", () => {
    const err = validateStringArray("tags", "notarray")
    expect(err).not.toBeNull()
    expect(err!.field).toBe("tags")
  })

  it("rejects array with non-string items", () => {
    const err = validateStringArray("tags", [1, 2])
    expect(err).not.toBeNull()
  })

  it("accepts valid string array", () => {
    expect(validateStringArray("tags", ["a", "b"])).toBeNull()
  })

  it("accepts empty array", () => {
    expect(validateStringArray("tags", [])).toBeNull()
  })

  it("accepts null", () => {
    expect(validateStringArray("tags", null)).toBeNull()
  })

  it("accepts undefined", () => {
    expect(validateStringArray("tags", undefined)).toBeNull()
  })
})

// ============================================================================
// Optional String Validation
// ============================================================================

describe("validateOptionalString", () => {
  it("accepts null (nullable field)", () => {
    expect(validateOptionalString("assignedTo", null)).toBeNull()
  })

  it("accepts undefined (field not provided)", () => {
    expect(validateOptionalString("assignedTo", undefined)).toBeNull()
  })

  it("accepts valid string", () => {
    expect(validateOptionalString("assignedTo", "user_123")).toBeNull()
  })

  it("rejects non-string value", () => {
    const err = validateOptionalString("assignedTo", 123)
    expect(err).not.toBeNull()
    expect(err!.field).toBe("assignedTo")
  })

  it("rejects boolean value", () => {
    const err = validateOptionalString("contactId", true)
    expect(err).not.toBeNull()
  })
})

// ============================================================================
// Contact Payload Validation
// ============================================================================

describe("validateContactPayload", () => {
  it("returns no errors for valid create payload", () => {
    const errors = validateContactPayload(
      { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
      "create"
    )
    expect(errors).toEqual([])
  })

  it("returns no errors for valid update payload", () => {
    const errors = validateContactPayload(
      { firstName: "Ada", status: "active" },
      "update"
    )
    expect(errors).toEqual([])
  })

  it("requires firstName on create", () => {
    const errors = validateContactPayload({ lastName: "Lovelace" }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "firstName" })])
    )
  })

  it("requires lastName on create", () => {
    const errors = validateContactPayload({ firstName: "Ada" }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "lastName" })])
    )
  })

  it("rejects empty firstName on create", () => {
    const errors = validateContactPayload({ firstName: "", lastName: "Lovelace" }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "firstName" })])
    )
  })

  it("allows missing firstName on update (partial update)", () => {
    const errors = validateContactPayload({ status: "active" }, "update")
    expect(errors.find((e) => e.field === "firstName")).toBeUndefined()
  })

  it("rejects empty firstName on update", () => {
    const errors = validateContactPayload({ firstName: "" }, "update")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "firstName" })])
    )
  })

  it("rejects null firstName on update (NOT NULL)", () => {
    const errors = validateContactPayload({ firstName: null }, "update")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "firstName" })])
    )
  })

  it("rejects null status (NOT NULL)", () => {
    const errors = validateContactPayload({ firstName: "Ada", lastName: "L", status: null }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "status" })])
    )
  })

  it("rejects invalid status enum", () => {
    const errors = validateContactPayload(
      { firstName: "Ada", lastName: "L", status: "garbage" },
      "create"
    )
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "status" })])
    )
  })

  it("accepts null email (nullable column)", () => {
    const errors = validateContactPayload(
      { firstName: "Ada", lastName: "L", email: null },
      "create"
    )
    expect(errors.find((e) => e.field === "email")).toBeUndefined()
  })

  it("rejects non-string email", () => {
    const errors = validateContactPayload(
      { firstName: "Ada", lastName: "L", email: 123 },
      "create"
    )
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "email" })])
    )
  })

  it("rejects invalid lastContactedAt date", () => {
    const errors = validateContactPayload(
      { firstName: "Ada", lastName: "L", lastContactedAt: "not-a-date" },
      "create"
    )
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "lastContactedAt" })])
    )
  })

  it("rejects non-array tags", () => {
    const errors = validateContactPayload(
      { firstName: "Ada", lastName: "L", tags: "notarray" },
      "create"
    )
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "tags" })])
    )
  })

  it("accepts valid tags array", () => {
    const errors = validateContactPayload(
      { firstName: "Ada", lastName: "L", tags: ["vip", "enterprise"] },
      "create"
    )
    expect(errors.find((e) => e.field === "tags")).toBeUndefined()
  })

  it("rejects null tags (NOT NULL)", () => {
    const errors = validateContactPayload(
      { firstName: "Ada", lastName: "L", tags: null },
      "create"
    )
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "tags" })])
    )
  })

  it("rejects null tags on update (NOT NULL)", () => {
    const errors = validateContactPayload({ tags: null }, "update")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "tags" })])
    )
  })

  it("rejects null metadata (NOT NULL)", () => {
    const errors = validateContactPayload(
      { firstName: "Ada", lastName: "L", metadata: null },
      "create"
    )
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "metadata" })])
    )
  })

  it("rejects non-object metadata", () => {
    const errors = validateContactPayload(
      { firstName: "Ada", lastName: "L", metadata: "notobject" },
      "create"
    )
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "metadata" })])
    )
  })

  it("rejects array metadata", () => {
    const errors = validateContactPayload(
      { firstName: "Ada", lastName: "L", metadata: [1, 2] },
      "create"
    )
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "metadata" })])
    )
  })

  it("accepts valid metadata object", () => {
    const errors = validateContactPayload(
      { firstName: "Ada", lastName: "L", metadata: { key: "value" } },
      "create"
    )
    expect(errors.find((e) => e.field === "metadata")).toBeUndefined()
  })

  it("does not reject unknown fields", () => {
    const errors = validateContactPayload(
      { firstName: "Ada", lastName: "L", id: "123", createdAt: "2024-01-01" },
      "create"
    )
    expect(errors).toEqual([])
  })
})

// ============================================================================
// Task Payload Validation
// ============================================================================

describe("validateTaskPayload", () => {
  it("returns no errors for valid create payload", () => {
    const errors = validateTaskPayload({ title: "Review docs" }, "create")
    expect(errors).toEqual([])
  })

  it("returns no errors for valid update payload", () => {
    const errors = validateTaskPayload({ priority: "high" }, "update")
    expect(errors).toEqual([])
  })

  it("requires title on create", () => {
    const errors = validateTaskPayload({ priority: "high" }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "title" })])
    )
  })

  it("rejects empty title on create", () => {
    const errors = validateTaskPayload({ title: "" }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "title" })])
    )
  })

  it("allows missing title on update (partial update)", () => {
    const errors = validateTaskPayload({ priority: "high" }, "update")
    expect(errors.find((e) => e.field === "title")).toBeUndefined()
  })

  it("rejects null title on update (NOT NULL)", () => {
    const errors = validateTaskPayload({ title: null }, "update")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "title" })])
    )
  })

  it("rejects null priority (NOT NULL)", () => {
    const errors = validateTaskPayload({ title: "Test", priority: null }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "priority" })])
    )
  })

  it("rejects invalid priority enum", () => {
    const errors = validateTaskPayload({ title: "Test", priority: "critical" }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "priority" })])
    )
  })

  it("rejects invalid taskType enum", () => {
    const errors = validateTaskPayload({ title: "Test", taskType: "review" }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "taskType" })])
    )
  })

  it("accepts valid taskType", () => {
    const errors = validateTaskPayload({ title: "Test", taskType: "approval" }, "create")
    expect(errors.find((e) => e.field === "taskType")).toBeUndefined()
  })

  it("rejects null taskType (NOT NULL)", () => {
    const errors = validateTaskPayload({ title: "Test", taskType: null }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "taskType" })])
    )
  })

  it("accepts null description (nullable column)", () => {
    const errors = validateTaskPayload({ title: "Test", description: null }, "create")
    expect(errors.find((e) => e.field === "description")).toBeUndefined()
  })

  it("rejects non-string description", () => {
    const errors = validateTaskPayload({ title: "Test", description: true }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "description" })])
    )
  })

  it("rejects invalid dueDate", () => {
    const errors = validateTaskPayload({ title: "Test", dueDate: "invalid" }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "dueDate" })])
    )
  })

  it("accepts valid dueDate", () => {
    const errors = validateTaskPayload({ title: "Test", dueDate: "2024-06-15" }, "create")
    expect(errors.find((e) => e.field === "dueDate")).toBeUndefined()
  })

  it("validates status enum on create", () => {
    const errors = validateTaskPayload({ title: "Test", status: "invalid" }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "status" })])
    )
  })

  it("does not validate status on update (handled by /status endpoint)", () => {
    const errors = validateTaskPayload({ status: "invalid" }, "update")
    expect(errors.find((e) => e.field === "status")).toBeUndefined()
  })

  // P2a: task field type validation
  it("rejects non-string assignedTo", () => {
    const errors = validateTaskPayload({ title: "Test", assignedTo: 123 }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "assignedTo" })])
    )
  })

  it("accepts null assignedTo (nullable column)", () => {
    const errors = validateTaskPayload({ title: "Test", assignedTo: null }, "create")
    expect(errors.find((e) => e.field === "assignedTo")).toBeUndefined()
  })

  it("accepts string assignedTo", () => {
    const errors = validateTaskPayload({ title: "Test", assignedTo: "user_1" }, "create")
    expect(errors.find((e) => e.field === "assignedTo")).toBeUndefined()
  })

  it("rejects non-string contactId", () => {
    const errors = validateTaskPayload({ title: "Test", contactId: 42 }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "contactId" })])
    )
  })

  it("rejects non-string workflowExecutionId", () => {
    const errors = validateTaskPayload({ title: "Test", workflowExecutionId: true }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "workflowExecutionId" })])
    )
  })

  it("rejects null position (NOT NULL)", () => {
    const errors = validateTaskPayload({ title: "Test", position: null }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "position" })])
    )
  })

  it("rejects non-number position", () => {
    const errors = validateTaskPayload({ title: "Test", position: "first" }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "position" })])
    )
  })

  it("accepts valid number position", () => {
    const errors = validateTaskPayload({ title: "Test", position: 5 }, "create")
    expect(errors.find((e) => e.field === "position")).toBeUndefined()
  })

  it("rejects null metadata (NOT NULL)", () => {
    const errors = validateTaskPayload({ title: "Test", metadata: null }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "metadata" })])
    )
  })

  it("rejects non-object metadata", () => {
    const errors = validateTaskPayload({ title: "Test", metadata: "string" }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "metadata" })])
    )
  })

  it("rejects array metadata", () => {
    const errors = validateTaskPayload({ title: "Test", metadata: [1, 2] }, "create")
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "metadata" })])
    )
  })

  it("accepts valid metadata object", () => {
    const errors = validateTaskPayload(
      { title: "Test", metadata: { links: ["https://example.com"] } },
      "create"
    )
    expect(errors.find((e) => e.field === "metadata")).toBeUndefined()
  })

  it("does not reject unknown fields", () => {
    const errors = validateTaskPayload(
      { title: "Test", id: "123", createdAt: "2024-01-01", orgId: "org_1" },
      "create"
    )
    expect(errors).toEqual([])
  })
})
