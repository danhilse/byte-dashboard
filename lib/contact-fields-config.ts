// ============================================================================
// Contact Fields Configuration
// ============================================================================

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

export const contactFieldConfig: Record<ContactField, { label: string; description?: string }> = {
  email: {
    label: "Email",
    description: "Contact's email address",
  },
  firstName: {
    label: "First Name",
    description: "Contact's first name",
  },
  lastName: {
    label: "Last Name",
    description: "Contact's last name",
  },
  phone: {
    label: "Phone",
    description: "Contact's phone number",
  },
  company: {
    label: "Company",
    description: "Company name",
  },
  status: {
    label: "Status",
    description: "Contact status (active, inactive, lead)",
  },
  title: {
    label: "Job Title",
    description: "Contact's job title",
  },
  department: {
    label: "Department",
    description: "Department within company",
  },
  address: {
    label: "Address",
    description: "Street address",
  },
  city: {
    label: "City",
    description: "City name",
  },
  state: {
    label: "State/Province",
    description: "State or province",
  },
  zipCode: {
    label: "ZIP/Postal Code",
    description: "ZIP or postal code",
  },
  country: {
    label: "Country",
    description: "Country name",
  },
  notes: {
    label: "Notes",
    description: "Additional notes",
  },
}

export const contactFieldOptions = allContactFields.map((field) => ({
  value: field,
  label: contactFieldConfig[field].label,
}))
