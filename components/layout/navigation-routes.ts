export const APP_NAME = "Byte CRM"

export interface AppRouteDefinition {
  id: string
  label: string
  href: string
  description?: string
  keywords?: string
}

export const PRIMARY_ROUTE_DEFINITIONS: AppRouteDefinition[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    description: "Overview and metrics",
    keywords: "overview home stats",
  },
  {
    id: "my-work",
    label: "My Work",
    href: "/my-work",
    description: "Assigned tasks and approvals",
    keywords: "tasks approvals work",
  },
  {
    id: "workflows",
    label: "Workflows",
    href: "/workflows",
    description: "Workflow executions",
    keywords: "executions pipeline process",
  },
  {
    id: "people",
    label: "People",
    href: "/people",
    description: "Contacts and profiles",
    keywords: "contacts crm",
  },
  {
    id: "support",
    label: "Support",
    href: "/support",
    description: "Help center",
    keywords: "help docs support",
  },
]

export const ADMIN_ROUTE_DEFINITIONS: AppRouteDefinition[] = [
  {
    id: "workflow-builder",
    label: "Workflow Builder",
    href: "/admin/workflow-builder",
  },
  {
    id: "assets",
    label: "Assets",
    href: "/admin/assets",
  },
  {
    id: "forms",
    label: "Form Builder",
    href: "/admin/forms",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/admin/settings",
  },
]

const SETTINGS_TAB_TITLES: Record<string, string> = {
  general: "General",
  billing: "Billing & Plans",
  users: "Users & Permissions",
  integrations: "Integrations",
  audit: "Audit Logs",
  crm: "CRM Settings",
  customizations: "Customizations",
}

export function toPageTitle(pathname: string): string {
  const normalized = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname

  if (normalized === "/dashboard") return "Dashboard"
  if (normalized === "/my-work" || normalized.startsWith("/my-work/") || normalized.startsWith("/tasks")) {
    return "My Work"
  }
  if (normalized === "/workflows") return "Workflows"
  if (normalized.startsWith("/workflows/")) return "Workflow Details"
  if (normalized === "/people") return "People"
  if (normalized.startsWith("/people/")) return "Contact Details"
  if (normalized === "/support") return "Support"
  if (normalized === "/calendar") return "Calendar"
  if (normalized === "/admin/workflow-builder") return "Workflow Builder"
  if (normalized.startsWith("/admin/workflow-builder/")) return "Edit Workflow Definition"
  if (normalized === "/admin/assets") return "Assets"
  if (normalized === "/admin/forms") return "Form Builder"
  if (normalized === "/admin/settings") return "Settings"
  if (normalized.startsWith("/admin/settings/")) {
    const settingsTab = normalized.split("/")[3]
    const tabTitle = settingsTab ? SETTINGS_TAB_TITLES[settingsTab] : null
    return tabTitle ? `Settings: ${tabTitle}` : "Settings"
  }

  return APP_NAME
}
