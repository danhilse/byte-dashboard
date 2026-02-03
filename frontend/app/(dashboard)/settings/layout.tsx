"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Settings,
  Bell,
  Users,
  Briefcase,
  Puzzle,
  Shield,
  CreditCard,
  Palette,
  Lock
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

// TODO: Replace with actual owner check from your auth system
function useIsOwner() {
  return true
}

const settingsTabs = [
  {
    title: "General",
    href: "/settings/general",
    icon: Settings,
  },
  {
    title: "Notifications",
    href: "/settings/notifications",
    icon: Bell,
  },
  {
    title: "Users & Roles",
    href: "/settings/users",
    icon: Users,
  },
  {
    title: "CRM",
    href: "/settings/crm",
    icon: Briefcase,
  },
  {
    title: "Integrations",
    href: "/settings/integrations",
    icon: Puzzle,
  },
  {
    title: "Security",
    href: "/settings/security",
    icon: Shield,
  },
  {
    title: "Billing",
    href: "/settings/billing",
    icon: CreditCard,
    ownerOnly: true,
  },
  {
    title: "Customizations",
    href: "/settings/customizations",
    icon: Palette,
  },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isOwner = useIsOwner()

  const visibleTabs = settingsTabs.filter(tab => !tab.ownerOnly || isOwner)

  // Get current tab for breadcrumb
  const currentTab = settingsTabs.find(tab => pathname === tab.href)

  return (
    <>
      <PageHeader
        breadcrumbs={
          currentTab
            ? [{ label: "Settings", href: "/settings" }, { label: currentTab.title }]
            : [{ label: "Settings" }]
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization settings and preferences.
          </p>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b">
          {visibleTabs.map((tab) => {
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
                {tab.ownerOnly && (
                  <Badge variant="secondary" className="gap-1 text-xs py-0 px-1.5">
                    <Lock className="size-3" />
                  </Badge>
                )}
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
