"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AlertTriangle,
  CreditCard,
  Database,
  Paintbrush,
  PlugZap,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const settingsTabs = [
  {
    title: "General",
    href: "/admin/settings/general",
    icon: Settings,
  },
  {
    title: "Billing & Plans",
    href: "/admin/settings/billing",
    icon: CreditCard,
  },
  {
    title: "Users & Permissions",
    href: "/admin/settings/users",
    icon: Users,
  },
  {
    title: "Integrations",
    href: "/admin/settings/integrations",
    icon: PlugZap,
  },
  {
    title: "Audit Logs",
    href: "/admin/settings/audit",
    icon: ShieldCheck,
  },
  {
    title: "CRM Settings",
    href: "/admin/settings/crm",
    icon: Database,
  },
  {
    title: "Customizations",
    href: "/admin/settings/customizations",
    icon: Paintbrush,
  },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Get current tab for breadcrumb
  const currentTab = settingsTabs.find(tab => pathname === tab.href)

  return (
    <>
      <PageHeader
        breadcrumbs={
          currentTab
            ? [{ label: "Settings", href: "/admin/settings" }, { label: currentTab.title }]
            : [{ label: "Settings" }]
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your workspace preferences, billing, and governance controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-primary">Onboarding trial in progress</p>
              <p className="text-sm text-muted-foreground">
                14 days left in your Pro trial. Unlock audit logging and integrations when you upgrade.
              </p>
            </div>
          </div>
          <Button className="shrink-0">Upgrade Plan</Button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b">
          {settingsTabs.map((tab) => {
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors hover:text-foreground whitespace-nowrap",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <tab.icon className="size-4" />
                {tab.title}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                )}
              </Link>
            )
          })}
        </div>

        {children}
      </div>
    </>
  )
}
