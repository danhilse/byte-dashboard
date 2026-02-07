import type { badgeVariants } from "@/components/ui/badge"
import type { VariantProps } from "class-variance-authority"

type BadgeProps = VariantProps<typeof badgeVariants>

type NotificationType = {
  id: string
  label: string
}

type Plan = {
  name: string
  price: string
  description: string
  features: string[]
  featured?: boolean
}

type BillingHistoryItem = {
  id: string
  date: string
  amount: string
  status: string
}

type UserRow = {
  name: string
  email: string
  role: string
  status: string
  lastLogin: string
  roleVariant: BadgeProps["variant"]
  statusVariant: BadgeProps["variant"]
}

type RoleSummary = {
  name: string
  members: number
  permissions: string
}

type Integration = {
  name: string
  description: string
  status: "Connected" | "Not Connected"
}

type AuditLogEntry = {
  timestamp: string
  user: string
  action: string
  resourceType: string
  resourceName: string
  changes: string
  ip: string
}

type CustomField = {
  name: string
  type: string
  required: boolean
}

type FieldGroup = {
  name: string
  fields: number
}

type WidgetOption = {
  id: string
  label: string
}

type LayoutPreset = {
  id: string
  label: string
  description: string
}

export const timeZones = [
  "Pacific Time (PT)",
  "Mountain Time (MT)",
  "Central Time (CT)",
  "Eastern Time (ET)",
  "UTC",
] as const

export const notificationTypes: NotificationType[] = [
  { id: "product", label: "Product Updates" },
  { id: "billing", label: "Billing Alerts" },
  { id: "security", label: "Security Alerts" },
  { id: "weekly", label: "Weekly Digest" },
  { id: "tasks", label: "Task Reminders" },
]

export const currentPlan = {
  name: "Pro",
  price: "$499/mo",
  status: "Active",
  features: [
    "Up to 50 team seats",
    "Priority success manager",
    "Advanced workflow automation",
    "Audit logs + data exports",
  ],
}

export const availablePlans: Plan[] = [
  {
    name: "Starter",
    price: "$99/mo",
    description: "Get organized with core CRM tools",
    features: ["Up to 5 seats", "Email support", "Basic automations"],
  },
  {
    name: "Pro",
    price: "$499/mo",
    description: "Scale your team with collaboration",
    features: ["Up to 50 seats", "Priority support", "Workflow templates"],
    featured: true,
  },
  {
    name: "Elite",
    price: "$999/mo",
    description: "Enterprise-grade governance",
    features: ["Unlimited seats", "SAML/SCIM", "Custom onboarding"],
  },
  {
    name: "Custom",
    price: "Contact Sales",
    description: "Purpose-built deployments",
    features: ["Dedicated team", "Custom integrations", "SLAs"],
  },
]

export const billingHistory: BillingHistoryItem[] = [
  { id: "inv-1024", date: "Aug 1, 2024", amount: "$499.00", status: "Paid" },
  { id: "inv-1003", date: "Jul 1, 2024", amount: "$499.00", status: "Paid" },
  { id: "inv-987", date: "Jun 1, 2024", amount: "$499.00", status: "Paid" },
]

export const users: UserRow[] = [
  {
    name: "Maya Patel",
    email: "maya@byte.com",
    role: "Admin",
    status: "Active",
    lastLogin: "2 hours ago",
    roleVariant: "default",
    statusVariant: "secondary",
  },
  {
    name: "Jordan Smith",
    email: "jordan@byte.com",
    role: "Manager",
    status: "Invited",
    lastLogin: "—",
    roleVariant: "secondary",
    statusVariant: "outline",
  },
  {
    name: "Felix Rivera",
    email: "felix@byte.com",
    role: "Contributor",
    status: "Active",
    lastLogin: "Yesterday",
    roleVariant: "outline",
    statusVariant: "secondary",
  },
  {
    name: "Ana Chen",
    email: "ana@byte.com",
    role: "Viewer",
    status: "Inactive",
    lastLogin: "30 days ago",
    roleVariant: "outline",
    statusVariant: "destructive",
  },
]

export const roles: RoleSummary[] = [
  { name: "Admin", members: 4, permissions: "Full access" },
  { name: "Manager", members: 8, permissions: "Teams + approvals" },
  { name: "Contributor", members: 21, permissions: "Workflows + tasks" },
  { name: "Viewer", members: 12, permissions: "Read-only" },
]

export const integrations: Integration[] = [
  {
    name: "Formstack",
    description: "Sync submissions into CRM records.",
    status: "Connected",
  },
  {
    name: "Zapier",
    description: "Automate workflows with 6,000+ apps.",
    status: "Connected",
  },
  {
    name: "Stripe",
    description: "Sync payments and invoices.",
    status: "Not Connected",
  },
  {
    name: "Custom Webhooks",
    description: "Send JSON payloads to your stack.",
    status: "Not Connected",
  },
]

export const auditLogs: AuditLogEntry[] = [
  {
    timestamp: "Aug 20, 2024 14:32",
    user: "Maya Patel",
    action: "Updated user role",
    resourceType: "User",
    resourceName: "Jordan Smith",
    changes: "Role changed from Viewer to Manager",
    ip: "192.168.0.12",
  },
  {
    timestamp: "Aug 18, 2024 09:02",
    user: "System Bot",
    action: "Revoked session",
    resourceType: "Authentication",
    resourceName: "Felix Rivera",
    changes: "Forced logout after password reset",
    ip: "10.0.0.5",
  },
  {
    timestamp: "Aug 15, 2024 18:22",
    user: "Alex Morris",
    action: "Exported contacts",
    resourceType: "Contacts",
    resourceName: "Global",
    changes: "CSV export containing 2,130 contacts",
    ip: "192.168.0.44",
  },
]

export const customFields: CustomField[] = [
  { name: "Customer Tier", type: "Select", required: true },
  { name: "Renewal Date", type: "Date", required: true },
  { name: "Implementation Owner", type: "User", required: false },
  { name: "Billing Notes", type: "Long Text", required: false },
]

export const fieldGroups: FieldGroup[] = [
  { name: "Company Profile", fields: 6 },
  { name: "Financials", fields: 4 },
  { name: "Engagement", fields: 5 },
]

export const widgetOptions: WidgetOption[] = [
  { id: "pipeline", label: "Pipeline Overview" },
  { id: "tasks", label: "My Tasks" },
  { id: "meetings", label: "Upcoming Meetings" },
  { id: "goals", label: "Goal Tracking" },
]

export const layoutPresets: LayoutPreset[] = [
  {
    id: "balanced",
    label: "Balanced",
    description: "Keeps equal emphasis across metrics.",
  },
  {
    id: "sales",
    label: "Revenue",
    description: "Highlights pipeline and forecast widgets.",
  },
  {
    id: "ops",
    label: "Operations",
    description: "Focus on work queues and SLA widgets.",
  },
]
