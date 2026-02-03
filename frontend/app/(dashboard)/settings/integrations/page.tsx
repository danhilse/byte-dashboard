import { Puzzle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function IntegrationsSettingsPage() {
  return (
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
  )
}
