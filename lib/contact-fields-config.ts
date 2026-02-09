// ============================================================================
// Contact Fields Configuration
// ============================================================================

import type { FieldInputType } from "./field-input-types"

export type ContactField =
  | "email"
  | "firstName"
  | "lastName"
  | "phone"
  | "company"
  | "status"
  | "title"
  | "department"
  | "address"
  | "city"
  | "state"
  | "zipCode"
  | "country"
  | "notes"

export const allContactFields: readonly ContactField[] = [
  "email",
  "firstName",
  "lastName",
  "phone",
  "company",
  "status",
  "title",
  "department",
  "address",
  "city",
  "state",
  "zipCode",
  "country",
  "notes",
]

export const contactFieldConfig: Record<ContactField, { label: string; description?: string; inputType: FieldInputType }> = {
  email: {
    label: "Email",
    description: "Contact's email address",
    inputType: "email",
  },
  firstName: {
    label: "First Name",
    description: "Contact's first name",
    inputType: "text",
  },
  lastName: {
    label: "Last Name",
    description: "Contact's last name",
    inputType: "text",
  },
  phone: {
    label: "Phone",
    description: "Contact's phone number",
    inputType: "tel",
  },
  company: {
    label: "Company",
    description: "Company name",
    inputType: "text",
  },
  status: {
    label: "Status",
    description: "Contact status (active, inactive, lead)",
    inputType: "contact_status",
  },
  title: {
    label: "Job Title",
    description: "Contact's job title",
    inputType: "text",
  },
  department: {
    label: "Department",
    description: "Department within company",
    inputType: "text",
  },
  address: {
    label: "Address",
    description: "Street address",
    inputType: "text",
  },
  city: {
    label: "City",
    description: "City name",
    inputType: "text",
  },
  state: {
    label: "State/Province",
    description: "State or province",
    inputType: "text",
  },
  zipCode: {
    label: "ZIP/Postal Code",
    description: "ZIP or postal code",
    inputType: "text",
  },
  country: {
    label: "Country",
    description: "Country name",
    inputType: "text",
  },
  notes: {
    label: "Notes",
    description: "Additional notes",
    inputType: "textarea",
  },
}

export const contactFieldOptions = allContactFields.map((field) => ({
  value: field,
  label: contactFieldConfig[field].label,
}))
