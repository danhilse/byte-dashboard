import Link from "next/link"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// TODO: Replace with actual owner check from your auth system
function useIsOwner() {
  return true
}

const settingsLinks = [
  {
    title: "General",
    description: "Basic organization settings and preferences",
    href: "/settings/general",
    icon: Settings,
  },
  {
    title: "Notifications",
    description: "Configure email and in-app notification preferences",
    href: "/settings/notifications",
    icon: Bell,
  },
  {
    title: "Users & Roles",
    description: "Manage team members, roles, and permissions",
    href: "/settings/users",
    icon: Users,
  },
  {
    title: "CRM",
    description: "Configure CRM fields, pipelines, and workflows",
    href: "/settings/crm",
    icon: Briefcase,
  },
  {
    title: "Integrations",
    description: "Connect third-party apps and services",
    href: "/settings/integrations",
    icon: Puzzle,
  },
  {
    title: "Audit & Security",
    description: "Security settings, audit logs, and compliance",
    href: "/settings/security",
    icon: Shield,
  },
  {
    title: "Billing",
    description: "Manage subscription, invoices, and payment methods",
    href: "/settings/billing",
    icon: CreditCard,
    ownerOnly: true,
  },
  {
    title: "Customizations",
    description: "Customize branding, themes, and UI preferences",
    href: "/settings/customizations",
    icon: Palette,
  },
]

export default function SettingsPage() {
  const isOwner = useIsOwner()

  const visibleLinks = settingsLinks.filter(link => !link.ownerOnly || isOwner)

  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Settings" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization settings and preferences.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <link.icon className="size-5 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{link.title}</CardTitle>
                      {link.ownerOnly && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Lock className="size-3" />
                          Owner
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{link.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
