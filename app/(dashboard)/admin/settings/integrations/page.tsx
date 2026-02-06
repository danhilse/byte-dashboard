import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { integrations } from "@/lib/data/settings"

export default function SettingsIntegrationsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Available Integrations</CardTitle>
          <CardDescription>Connect Byte to the tools your teams rely on.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {integrations.map((integration) => (
            <div key={integration.name} className="flex items-start justify-between rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback>{integration.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{integration.name}</p>
                  <p className="text-sm text-muted-foreground">{integration.description}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={integration.status === "Connected" ? "secondary" : "outline"}>
                  {integration.status}
                </Badge>
                <Button variant="outline" size="sm">
                  {integration.status === "Connected" ? "Configure" : "Connect"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integration Types</CardTitle>
          <CardDescription>Mix and match automation layers.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="font-medium">Formstack</p>
            <p className="text-sm text-muted-foreground">Embed workflows directly into your existing forms.</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="font-medium">Zapier</p>
            <p className="text-sm text-muted-foreground">Trigger Byte actions from 6,000+ SaaS connectors.</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="font-medium">Stripe</p>
            <p className="text-sm text-muted-foreground">Mirror payment state and invoice lifecycles.</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="font-medium">Custom Webhooks</p>
            <p className="text-sm text-muted-foreground">Send structured data to any secured endpoint.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
