import { CreditCard } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function BillingSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-5" />
          Subscription & Billing
        </CardTitle>
        <CardDescription>
          View your current plan and manage billing details.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-[200px] items-center justify-center text-muted-foreground">
        Billing management coming soon.
      </CardContent>
    </Card>
  )
}
