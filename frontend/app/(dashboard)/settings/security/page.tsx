import { Shield } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SecuritySettingsPage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Audit & Security" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit & Security</h1>
          <p className="text-muted-foreground">
            Security settings, audit logs, and compliance.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              Security Overview
            </CardTitle>
            <CardDescription>
              Review security settings and audit logs.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-[200px] items-center justify-center text-muted-foreground">
            Security settings coming soon.
          </CardContent>
        </Card>
      </div>
    </>
  )
}
