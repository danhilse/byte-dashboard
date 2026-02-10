"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

const APP_NAME = "Byte CRM"

const settingsTabTitles: Record<string, string> = {
  general: "General",
  billing: "Billing & Plans",
  users: "Users & Permissions",
  integrations: "Integrations",
  audit: "Audit Logs",
  crm: "CRM Settings",
  customizations: "Customizations",
}

function toPageTitle(pathname: string): string {
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
    const tabTitle = settingsTab ? settingsTabTitles[settingsTab] : null
    return tabTitle ? `Settings: ${tabTitle}` : "Settings"
  }

  return APP_NAME
}

export function RouteTitleSync() {
  const pathname = usePathname()

  useEffect(() => {
    const pageTitle = toPageTitle(pathname)
    document.title = pageTitle === APP_NAME ? APP_NAME : `${pageTitle} | ${APP_NAME}`
  }, [pathname])

  return null
}

