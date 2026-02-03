import { Puzzle } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function IntegrationsSettingsPage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Integrations" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground">
            Connect third-party apps and services.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Puzzle className="size-5" />
              Available Integrations
            </CardTitle>
            <CardDescription>
              Connect your favorite tools and services.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-[200px] items-center justify-center text-muted-foreground">
            Integrations marketplace coming soon.
          </CardContent>
        </Card>
      </div>
    </>
  )
}
