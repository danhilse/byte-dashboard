import { Briefcase } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CRMSettingsPage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "CRM" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM Settings</h1>
          <p className="text-muted-foreground">
            Configure CRM fields, pipelines, and workflows.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="size-5" />
              CRM Configuration
            </CardTitle>
            <CardDescription>
              Customize your CRM to match your business processes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-[200px] items-center justify-center text-muted-foreground">
            CRM settings coming soon.
          </CardContent>
        </Card>
      </div>
    </>
  )
}
