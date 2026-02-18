// ============================================================================
// Contact Fields Configuration — derived from field registry
// ============================================================================
// Keys are now DB-aligned: addressLine1, addressLine2, zip (not address, zipCode, country)

import type { FieldInputType } from "./field-input-types"
import { getFieldsForEntity } from "@/lib/field-registry"

const contactFieldDefs = getFieldsForEntity("contact")

export type ContactField = (typeof contactFieldDefs)[number]["key"]

export const allContactFields: readonly string[] = contactFieldDefs.map((f) => f.key)

export const contactFieldConfig: Record<string, { label: string; description?: string; inputType: FieldInputType }> =
  Object.fromEntries(
    contactFieldDefs.map((f) => [
      f.key,
      {
        label: f.label,
        description: f.description,
        inputType: f.inputType,
      },
    ])
  )

export const contactFieldOptions = contactFieldDefs.map((f) => ({
  value: f.key,
  label: f.label,
}))
