import { getFieldDefinition, type EntityType } from "@/lib/field-registry"

export interface ValidationError {
  field: string
  message: string
}

// ---- Primitives ----

/** Validate body is a non-null plain object (not array, string, number). */
export function validateBodyShape(body: unknown): ValidationError[] | null {
  if (body === null || body === undefined) {
    return [{ field: "_body", message: "Request body must be a JSON object" }]
  }
  if (Array.isArray(body)) {
    return [{ field: "_body", message: "Request body must be a JSON object" }]
  }
  if (typeof body !== "object") {
    return [{ field: "_body", message: "Request body must be a JSON object" }]
  }
  return null
}

/** Validate a string value against a field's enumValues from the registry. Returns null if valid. */
export function validateEnumField(
  entity: EntityType,
  fieldKey: string,
  value: unknown
): ValidationError | null {
  if (value === undefined || value === null) return null

  const fieldDef = getFieldDefinition(entity, fieldKey)
  if (!fieldDef?.enumValues) return null

  if (typeof value !== "string") {
    return {
      field: fieldKey,
      message: `${fieldDef.label} must be a string`,
    }
  }

  if (!fieldDef.enumValues.includes(value)) {
    return {
      field: fieldKey,
      message: `${fieldDef.label} must be one of: ${fieldDef.enumValues.join(", ")}`,
    }
  }

  return null
}

/** Validate a date string produces a valid Date. Null/undefined is valid (caller handles nullability). */
export function validateDateString(
  fieldName: string,
  value: unknown
): ValidationError | null {
  if (value === undefined || value === null) return null

  if (typeof value !== "string") {
    return { field: fieldName, message: `${fieldName} must be a date string` }
  }

  const date = new Date(value)
  if (isNaN(date.getTime())) {
    return { field: fieldName, message: `${fieldName} must be a valid date` }
  }

  return null
}

/** Validate value is a string[]. Null/undefined is valid (caller handles nullability). */
export function validateStringArray(
  fieldName: string,
  value: unknown
): ValidationError | null {
  if (value === undefined || value === null) return null

  if (!Array.isArray(value)) {
    return { field: fieldName, message: `${fieldName} must be an array of strings` }
  }

  if (!value.every((item) => typeof item === "string")) {
    return { field: fieldName, message: `${fieldName} must contain only strings` }
  }

  return null
}

/** Validate value is a non-empty string (after trimming). */
export function validateRequiredString(
  fieldName: string,
  value: unknown
): ValidationError | null {
  if (value === undefined || value === null) {
    return { field: fieldName, message: `${fieldName} is required` }
  }

  if (typeof value !== "string") {
    return { field: fieldName, message: `${fieldName} must be a string` }
  }

  if (value.trim().length === 0) {
    return { field: fieldName, message: `${fieldName} must not be empty` }
  }

  return null
}

/** Validate a NOT-NULL field is not explicitly null. */
export function validateNotNull(
  fieldName: string,
  value: unknown
): ValidationError | null {
  if (value === null) {
    return { field: fieldName, message: `${fieldName} cannot be null` }
  }
  return null
}

/** Validate value is a string (when provided and non-null). */
export function validateOptionalString(
  fieldName: string,
  value: unknown
): ValidationError | null {
  if (value === undefined || value === null) return null

  if (typeof value !== "string") {
    return { field: fieldName, message: `${fieldName} must be a string` }
  }

  return null
}

// ---- Entity Validators ----

/** Validate a contact POST/PATCH body. Returns array of errors (empty = valid). */
export function validateContactPayload(
  body: Record<string, unknown>,
  mode: "create" | "update"
): ValidationError[] {
  const errors: ValidationError[] = []

  if (mode === "create") {
    // Required fields for create
    const firstNameErr = validateRequiredString("firstName", body.firstName)
    if (firstNameErr) errors.push(firstNameErr)

    const lastNameErr = validateRequiredString("lastName", body.lastName)
    if (lastNameErr) errors.push(lastNameErr)
  } else {
    // Update mode: only validate if provided
    if (body.firstName !== undefined) {
      const notNullErr = validateNotNull("firstName", body.firstName)
      if (notNullErr) {
        errors.push(notNullErr)
      } else {
        const strErr = validateRequiredString("firstName", body.firstName)
        if (strErr) errors.push(strErr)
      }
    }

    if (body.lastName !== undefined) {
      const notNullErr = validateNotNull("lastName", body.lastName)
      if (notNullErr) {
        errors.push(notNullErr)
      } else {
        const strErr = validateRequiredString("lastName", body.lastName)
        if (strErr) errors.push(strErr)
      }
    }
  }

  // status: enum + NOT NULL
  if (body.status !== undefined) {
    const notNullErr = validateNotNull("status", body.status)
    if (notNullErr) {
      errors.push(notNullErr)
    } else {
      const enumErr = validateEnumField("contact", "status", body.status)
      if (enumErr) errors.push(enumErr)
    }
  }

  // lastContactedAt: date validation
  if (body.lastContactedAt !== undefined) {
    const dateErr = validateDateString("lastContactedAt", body.lastContactedAt)
    if (dateErr) errors.push(dateErr)
  }

  // tags: string array + NOT NULL
  if (body.tags !== undefined) {
    const notNullErr = validateNotNull("tags", body.tags)
    if (notNullErr) {
      errors.push(notNullErr)
    } else {
      const arrErr = validateStringArray("tags", body.tags)
      if (arrErr) errors.push(arrErr)
    }
  }

  // metadata: object + NOT NULL
  if (body.metadata !== undefined) {
    const notNullErr = validateNotNull("metadata", body.metadata)
    if (notNullErr) {
      errors.push(notNullErr)
    } else if (typeof body.metadata !== "object" || Array.isArray(body.metadata)) {
      errors.push({ field: "metadata", message: "metadata must be an object" })
    }
  }

  // email: optional string type check
  if (body.email !== undefined) {
    const strErr = validateOptionalString("email", body.email)
    if (strErr) errors.push(strErr)
  }

  // description: optional string type check
  if (body.description !== undefined) {
    const strErr = validateOptionalString("description", body.description)
    if (strErr) errors.push(strErr)
  }

  return errors
}

/** Validate a task POST/PATCH body. Returns array of errors (empty = valid). */
export function validateTaskPayload(
  body: Record<string, unknown>,
  mode: "create" | "update"
): ValidationError[] {
  const errors: ValidationError[] = []

  if (mode === "create") {
    // title: required non-empty string
    const titleErr = validateRequiredString("title", body.title)
    if (titleErr) errors.push(titleErr)
  } else {
    // Update mode: only validate if provided
    if (body.title !== undefined) {
      const notNullErr = validateNotNull("title", body.title)
      if (notNullErr) {
        errors.push(notNullErr)
      } else {
        const strErr = validateRequiredString("title", body.title)
        if (strErr) errors.push(strErr)
      }
    }
  }

  // status: enum + NOT NULL (only for create — PATCH /tasks/[id] rejects status)
  if (mode === "create" && body.status !== undefined) {
    const notNullErr = validateNotNull("status", body.status)
    if (notNullErr) {
      errors.push(notNullErr)
    } else {
      const enumErr = validateEnumField("task", "status", body.status)
      if (enumErr) errors.push(enumErr)
    }
  }

  // priority: enum + NOT NULL
  if (body.priority !== undefined) {
    const notNullErr = validateNotNull("priority", body.priority)
    if (notNullErr) {
      errors.push(notNullErr)
    } else {
      const enumErr = validateEnumField("task", "priority", body.priority)
      if (enumErr) errors.push(enumErr)
    }
  }

  // taskType: enum + NOT NULL
  if (body.taskType !== undefined) {
    const notNullErr = validateNotNull("taskType", body.taskType)
    if (notNullErr) {
      errors.push(notNullErr)
    } else {
      const enumErr = validateEnumField("task", "taskType", body.taskType)
      if (enumErr) errors.push(enumErr)
    }
  }

  // dueDate: date validation
  if (body.dueDate !== undefined) {
    const dateErr = validateDateString("dueDate", body.dueDate)
    if (dateErr) errors.push(dateErr)
  }

  // description: optional string type check
  if (body.description !== undefined) {
    const strErr = validateOptionalString("description", body.description)
    if (strErr) errors.push(strErr)
  }

  // assignedTo: optional string (nullable column)
  if (body.assignedTo !== undefined) {
    const strErr = validateOptionalString("assignedTo", body.assignedTo)
    if (strErr) errors.push(strErr)
  }

  // assignedRole: optional string (nullable column)
  if (body.assignedRole !== undefined) {
    const strErr = validateOptionalString("assignedRole", body.assignedRole)
    if (strErr) errors.push(strErr)
  }

  // contactId: optional string (nullable column)
  if (body.contactId !== undefined) {
    const strErr = validateOptionalString("contactId", body.contactId)
    if (strErr) errors.push(strErr)
  }

  // workflowExecutionId: optional string (nullable column)
  if (body.workflowExecutionId !== undefined) {
    const strErr = validateOptionalString("workflowExecutionId", body.workflowExecutionId)
    if (strErr) errors.push(strErr)
  }

  // position: optional number, NOT NULL
  if (body.position !== undefined) {
    const notNullErr = validateNotNull("position", body.position)
    if (notNullErr) {
      errors.push(notNullErr)
    } else if (typeof body.position !== "number") {
      errors.push({ field: "position", message: "position must be a number" })
    }
  }

  // metadata: optional object, NOT NULL
  if (body.metadata !== undefined) {
    const notNullErr = validateNotNull("metadata", body.metadata)
    if (notNullErr) {
      errors.push(notNullErr)
    } else if (typeof body.metadata !== "object" || Array.isArray(body.metadata)) {
      errors.push({ field: "metadata", message: "metadata must be an object" })
    }
  }

  return errors
}
