"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  Users,
  Database,
  UserCircle,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { cn } from "@/lib/utils"

const settingsTabs = [
  {
    title: "Organization",
    href: "/admin/settings/organization",
    icon: Building2,
  },
  {
    title: "Team",
    href: "/admin/settings/team",
    icon: Users,
  },
  {
    title: "Data",
    href: "/admin/settings/data",
    icon: Database,
  },
  {
    title: "Account",
    href: "/admin/settings/account",
    icon: UserCircle,
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
            Manage your organization settings and preferences.
          </p>
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
