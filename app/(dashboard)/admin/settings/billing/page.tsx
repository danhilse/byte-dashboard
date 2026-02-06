import { CheckCircle2, CreditCard, Download, ShieldCheck } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { availablePlans, billingHistory, currentPlan } from "@/lib/data/settings"

export default function SettingsBillingPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-4 text-primary" />
              <CardTitle>Current Plan</CardTitle>
            </div>
            <CardDescription>Track plan status and included benefits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-lg font-semibold">{currentPlan.name}</p>
              <Badge>{currentPlan.status}</Badge>
              <span className="text-sm text-muted-foreground">{currentPlan.price}</span>
            </div>
            <ul className="grid gap-2">
              {currentPlan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <Button>Manage Plan</Button>
              <Button variant="outline">View Usage</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-primary" />
              <CardTitle>Payment Method</CardTitle>
            </div>
            <CardDescription>Update card on file without downtime.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Visa ending in 4242</p>
              <p className="text-sm">Expires 09/26</p>
            </div>
            <Button variant="outline" className="w-full">
              Update Payment Method
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>Preview what each plan unlocks.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {availablePlans.map((plan) => (
            <div key={plan.name} className="flex flex-col rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
                {plan.featured && <Badge variant="secondary">Most popular</Badge>}
              </div>
              <p className="mt-4 text-2xl font-bold">{plan.price}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="mt-4" variant={plan.name === currentPlan.name ? "ghost" : "outline"}>
                {plan.name === currentPlan.name
                  ? "Current Plan"
                  : plan.name === "Custom"
                    ? "Contact Sales"
                    : "Upgrade"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Invoices and receipts from the past 90 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingHistory.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.date}</TableCell>
                  <TableCell className="font-mono text-xs">{invoice.id}</TableCell>
                  <TableCell>{invoice.amount}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{invoice.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="size-4" />
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="self-start">
            Cancel Subscription
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel subscription</AlertDialogTitle>
            <AlertDialogDescription>
              You will retain access until the end of your billing cycle. Let us know why you are leaving so we can improve.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason</Label>
            <Select defaultValue="budget">
              <SelectTrigger id="cancel-reason" className="w-full">
                <SelectValue placeholder="Choose a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="budget">Budget constraints</SelectItem>
                <SelectItem value="features">Missing features</SelectItem>
                <SelectItem value="support">Support experience</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm Cancelation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
