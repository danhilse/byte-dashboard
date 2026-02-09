// ============================================================================
// Role Configuration
// ============================================================================

export type Role =
  | "admin"
  | "manager"
  | "member"
  | "reviewer"
  | "hr_coordinator"
  | "hr_screener"
  | "hiring_manager"
  | "onboarding_coordinator"
  | "compliance_officer"
  | "sales_rep"
  | "account_manager"

export const allRoles: readonly Role[] = [
  "admin",
  "manager",
  "member",
  "reviewer",
  "hr_coordinator",
  "hr_screener",
  "hiring_manager",
  "onboarding_coordinator",
  "compliance_officer",
  "sales_rep",
  "account_manager",
]

export const roleConfig: Record<Role, { label: string; description?: string }> = {
  admin: {
    label: "Admin",
    description: "System administrator with full access",
  },
  manager: {
    label: "Manager",
    description: "Team manager with oversight responsibilities",
  },
  member: {
    label: "Member",
    description: "Standard team member",
  },
  reviewer: {
    label: "Reviewer",
    description: "Reviews workflow tasks and submissions",
  },
  hr_coordinator: {
    label: "HR Coordinator",
    description: "Coordinates HR processes",
  },
  hr_screener: {
    label: "HR Screener",
    description: "Conducts initial candidate screening",
  },
  hiring_manager: {
    label: "Hiring Manager",
    description: "Makes final hiring decisions",
  },
  onboarding_coordinator: {
    label: "Onboarding Coordinator",
    description: "Manages new hire onboarding",
  },
  compliance_officer: {
    label: "Compliance Officer",
    description: "Handles compliance and background checks",
  },
  sales_rep: {
    label: "Sales Representative",
    description: "Manages sales activities",
  },
  account_manager: {
    label: "Account Manager",
    description: "Manages client relationships",
  },
}

export const roleOptions = allRoles.map((role) => ({
  value: role,
  label: roleConfig[role].label,
}))
