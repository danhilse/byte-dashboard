import { Briefcase, Puzzle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DataSettingsPage() {
  return (
    <div className="grid gap-6">
      {/* CRM Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="size-5" />
            CRM Fields
          </CardTitle>
          <CardDescription>
            Customize your CRM to match your business processes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[200px] items-center justify-center text-muted-foreground">
          CRM field customization coming soon.
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Puzzle className="size-5" />
            Integrations
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
  )
}
