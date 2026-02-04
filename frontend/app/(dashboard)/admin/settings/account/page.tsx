import { Shield, CreditCard } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AccountSettingsPage() {
  return (
    <div className="grid gap-6">
      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Security
          </CardTitle>
          <CardDescription>
            Review security settings and audit logs.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[200px] items-center justify-center text-muted-foreground">
          Security settings coming soon.
        </CardContent>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" />
            Billing
          </CardTitle>
          <CardDescription>
            View your current plan and manage billing details.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[200px] items-center justify-center text-muted-foreground">
          Billing management coming soon.
        </CardContent>
      </Card>
    </div>
  )
}
