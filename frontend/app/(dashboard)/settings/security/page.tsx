import { Shield } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SecuritySettingsPage() {
  return (
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
  )
}
