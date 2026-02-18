// ============================================================================
// Contact Fields Configuration — derived from field registry
// ============================================================================
// Keys are now DB-aligned: addressLine1, addressLine2, zip (not address, zipCode, country)

import type { FieldInputType } from "./field-input-types"
import { getFieldsForEntity, CONTACT_FIELD_KEYS, type ContactFieldKey } from "@/lib/field-registry"

export type ContactField = ContactFieldKey

export const allContactFields = CONTACT_FIELD_KEYS

const contactFieldDefs = getFieldsForEntity("contact")

export const contactFieldConfig = Object.fromEntries(
  contactFieldDefs.map((f) => [
    f.key,
    {
      label: f.label,
      description: f.description,
      inputType: f.inputType,
    },
  ])
) as Record<ContactField, { label: string; description?: string; inputType: FieldInputType }>

export const contactFieldOptions = contactFieldDefs.map((f) => ({
  value: f.key as ContactField,
  label: f.label,
}))
