import { CreditCard } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function BillingSettingsPage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Billing" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">
            Manage subscription, invoices, and payment methods.
          </p>
        </div>

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
      </div>
    </>
  )
}
