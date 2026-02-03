import { Briefcase } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CRMSettingsPage() {
  return (
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
  )
}
