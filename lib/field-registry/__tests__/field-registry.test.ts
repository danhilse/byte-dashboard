import { describe, it, expect } from "vitest"
import {
  isDataTypeCompatible,
  getFieldsForEntity,
  getFieldDefinition,
  getRuntimeWritableFields,
  getVariablesForTrigger,
  getActionIOSchema,
  isActionRuntimeSupported,
  getActionOutputVariables,
  filterVariableOptions,
  getWatchableContactFieldOptions,
  getCustomVariableDataTypeOptions,
} from "../index"

// ============================================================================
// 1. Data Type Compatibility Matrix
// ============================================================================

describe("isDataTypeCompatible", () => {
  it("email can be used as text (broad target)", () => {
    expect(isDataTypeCompatible("email", "text")).toBe(true)
  })

  it("text cannot be used as email (strict target)", () => {
    expect(isDataTypeCompatible("text", "email")).toBe(false)
  })

  it("name can be used as text", () => {
    expect(isDataTypeCompatible("name", "text")).toBe(true)
  })

  it("text can be used as name", () => {
    expect(isDataTypeCompatible("text", "name")).toBe(true)
  })

  it("datetime compatible as date target (safe truncation)", () => {
    expect(isDataTypeCompatible("datetime", "date")).toBe(true)
  })

  it("date cannot be used as datetime", () => {
    expect(isDataTypeCompatible("date", "datetime")).toBe(false)
  })

  it("phone can be used as text", () => {
    expect(isDataTypeCompatible("phone", "text")).toBe(true)
  })

  it("text cannot be used as phone (strict)", () => {
    expect(isDataTypeCompatible("text", "phone")).toBe(false)
  })

  it("same type is always compatible", () => {
    expect(isDataTypeCompatible("email", "email")).toBe(true)
    expect(isDataTypeCompatible("number", "number")).toBe(true)
    expect(isDataTypeCompatible("boolean", "boolean")).toBe(true)
  })

  it("url can be used as text", () => {
    expect(isDataTypeCompatible("url", "text")).toBe(true)
  })

  it("number and text are incompatible", () => {
    expect(isDataTypeCompatible("number", "text")).toBe(false)
    expect(isDataTypeCompatible("text", "number")).toBe(false)
  })
})

// ============================================================================
// 2. Entity Field Registry Integrity
// ============================================================================

describe("entity field registry", () => {
  describe("contact fields", () => {
    it("uses DB-aligned keys", () => {
      const fields = getFieldsForEntity("contact")
      const keys = fields.map((f) => f.key)

      // DB-aligned keys should exist
      expect(keys).toContain("addressLine1")
      expect(keys).toContain("addressLine2")
      expect(keys).toContain("zip")

      // Old mismatched keys should NOT exist
      expect(keys).not.toContain("address")
      expect(keys).not.toContain("zipCode")
      expect(keys).not.toContain("country")
    })

    it("firstName and lastName have name dataType", () => {
      expect(getFieldDefinition("contact", "firstName")?.dataType).toBe("name")
      expect(getFieldDefinition("contact", "lastName")?.dataType).toBe("name")
    })

    it("phone has phone dataType", () => {
      expect(getFieldDefinition("contact", "phone")?.dataType).toBe("phone")
    })

    it("status has contact_status dataType with enum values", () => {
      const field = getFieldDefinition("contact", "status")
      expect(field?.dataType).toBe("contact_status")
      expect(field?.enumValues).toEqual(["active", "inactive", "lead"])
    })
  })

  describe("task fields", () => {
    it("runtime-writable fields match ALLOWED_UPDATE_TASK_FIELDS", () => {
      const writable = getRuntimeWritableFields("task").map((f) => f.key)
      // Must match generic-workflow.ts:95-101
      expect(writable).toContain("status")
      expect(writable).toContain("priority")
      expect(writable).toContain("description")
      expect(writable).toContain("assignedRole")
      expect(writable).toContain("assignedTo")

      // These should NOT be runtime-writable
      expect(writable).not.toContain("title")
      expect(writable).not.toContain("dueDate")
      expect(writable).not.toContain("outcome")
      expect(writable).not.toContain("completedAt")
    })

    it("status has task_status dataType (not workflow status)", () => {
      const field = getFieldDefinition("task", "status")
      expect(field?.dataType).toBe("task_status")
      expect(field?.inputType).toBe("task_status")
    })

    it("priority enum values include urgent", () => {
      const field = getFieldDefinition("task", "priority")
      expect(field?.enumValues).toEqual(["low", "medium", "high", "urgent"])
    })

    it("status enum values match runtime validation", () => {
      const field = getFieldDefinition("task", "status")
      expect(field?.enumValues).toEqual(["backlog", "todo", "in_progress", "done"])
    })

    it("outcome and completedAt are read-only", () => {
      expect(getFieldDefinition("task", "outcome")?.isReadOnly).toBe(true)
      expect(getFieldDefinition("task", "completedAt")?.isReadOnly).toBe(true)
    })
  })

  describe("user fields", () => {
    it("all user fields are read-only", () => {
      const fields = getFieldsForEntity("user")
      expect(fields.every((f) => f.isReadOnly)).toBe(true)
    })
  })
})

// ============================================================================
// 3. Trigger Variable Pools
// ============================================================================

describe("getVariablesForTrigger", () => {
  it("manual trigger provides contact variable with fields from registry", () => {
    const vars = getVariablesForTrigger("manual")
    expect(vars).toHaveLength(1)
    expect(vars[0].id).toBe("var-contact")
    expect(vars[0].type).toBe("contact")
    expect(vars[0].readOnly).toBe(true)

    const fields = vars[0].fields!
    expect(fields.length).toBeGreaterThan(0)
    // Should include DB-aligned field keys
    const keys = fields.map((f) => f.key)
    expect(keys).toContain("email")
    expect(keys).toContain("firstName")
    expect(keys).toContain("addressLine1")
    expect(keys).toContain("zip")
  })

  it("form_submission trigger provides contact + form submission variables", () => {
    const vars = getVariablesForTrigger("form_submission")
    expect(vars).toHaveLength(2)
    expect(vars[0].id).toBe("var-contact")
    expect(vars[1].id).toBe("var-form-submission")
    expect(vars[1].type).toBe("form_submission")
    expect(vars[1].fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "submittedAt" }),
      ])
    )
  })

  it("all contact-based triggers provide the same contact variable pool", () => {
    const triggerTypes = ["manual", "contact_created", "contact_field_changed", "api"] as const
    for (const type of triggerTypes) {
      const vars = getVariablesForTrigger(type)
      const contactVar = vars.find((v) => v.id === "var-contact")
      expect(contactVar).toBeDefined()
      expect(contactVar!.type).toBe("contact")
    }
  })
})

// ============================================================================
// 4. Action IO Contracts
// ============================================================================

describe("action IO registry", () => {
  it("create_task outputs only taskId", () => {
    const schema = getActionIOSchema("create_task")
    expect(schema.runtimeSupported).toBe(true)
    expect(schema.outputs).toHaveLength(1)
    expect(schema.outputs[0].key).toBe("taskId")
  })

  it("create_contact is NOT runtime supported", () => {
    expect(isActionRuntimeSupported("create_contact")).toBe(false)
  })

  it("update_task is NOT runtime supported", () => {
    expect(isActionRuntimeSupported("update_task")).toBe(false)
  })

  it("send_email, notification, update_contact, update_status, set_variable ARE runtime supported", () => {
    expect(isActionRuntimeSupported("send_email")).toBe(true)
    expect(isActionRuntimeSupported("notification")).toBe(true)
    expect(isActionRuntimeSupported("update_contact")).toBe(true)
    expect(isActionRuntimeSupported("update_status")).toBe(true)
    expect(isActionRuntimeSupported("set_variable")).toBe(true)
  })

  it("getActionOutputVariables produces variables only for actions with outputs", () => {
    const taskVars = getActionOutputVariables("create_task", "action-1", "Test Task")
    expect(taskVars).toHaveLength(1)
    expect(taskVars[0].fields).toHaveLength(1)
    expect(taskVars[0].fields![0].key).toBe("taskId")

    const emailVars = getActionOutputVariables("send_email", "action-2", "Test Email")
    expect(emailVars).toHaveLength(0)
  })
})

// ============================================================================
// 5. Filter Helpers
// ============================================================================

describe("filterVariableOptions", () => {
  it("filters by directional compatibility", () => {
    const variables = [
      {
        id: "var-contact",
        name: "Contact",
        type: "contact" as const,
        source: { type: "trigger" as const },
        readOnly: true,
        fields: [
          { key: "email", label: "Email", dataType: "email" as const },
          { key: "firstName", label: "First Name", dataType: "name" as const },
          { key: "phone", label: "Phone", dataType: "phone" as const },
          { key: "company", label: "Company", dataType: "text" as const },
        ],
      },
    ]

    // Requesting "text" should return all text-compatible: text, name, email, phone
    const textOptions = filterVariableOptions(variables, "text")
    expect(textOptions.length).toBe(4) // email, name, phone, text are all text-compatible

    // Requesting "email" should only return email
    const emailOptions = filterVariableOptions(variables, "email")
    expect(emailOptions.length).toBe(1)
    expect(emailOptions[0].fieldKey).toBe("email")

    // Requesting "phone" should only return phone
    const phoneOptions = filterVariableOptions(variables, "phone")
    expect(phoneOptions.length).toBe(1)
    expect(phoneOptions[0].fieldKey).toBe("phone")
  })
})

describe("getWatchableContactFieldOptions", () => {
  it("returns options derived from entity-fields registry", () => {
    const options = getWatchableContactFieldOptions()
    expect(options.length).toBeGreaterThan(0)
    // Should include DB-aligned keys
    const values = options.map((o) => o.value)
    expect(values).toContain("email")
    expect(values).toContain("firstName")
    expect(values).toContain("addressLine1")
    expect(values).toContain("zip")
    // Should NOT include old mismatched keys
    expect(values).not.toContain("address")
    expect(values).not.toContain("zipCode")
  })
})

describe("getCustomVariableDataTypeOptions", () => {
  it("returns the expected custom variable types", () => {
    const options = getCustomVariableDataTypeOptions()
    const values = options.map((o) => o.value)
    expect(values).toContain("text")
    expect(values).toContain("number")
    expect(values).toContain("email")
    expect(values).toContain("boolean")
    expect(values).toContain("date")
  })
})
