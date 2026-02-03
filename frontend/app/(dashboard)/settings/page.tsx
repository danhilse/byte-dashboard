import Link from "next/link"
import { User, Users, Building } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const settingsLinks = [
  {
    title: "Profile",
    description: "Manage your personal information and preferences",
    href: "/settings/profile",
    icon: User,
  },
  {
    title: "Team",
    description: "Manage team members and their permissions",
    href: "/settings/team",
    icon: Users,
  },
  {
    title: "Organization",
    description: "Configure organization settings and billing",
    href: "/settings/organization",
    icon: Building,
  },
]

export default function SettingsPage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Settings" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and organization settings.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {settingsLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <link.icon className="size-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{link.title}</CardTitle>
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
