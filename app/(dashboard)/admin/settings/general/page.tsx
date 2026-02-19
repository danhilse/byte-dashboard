import { Upload } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { notificationTypes, timeZones } from "@/lib/data/settings"
import { EmailSenderSettingsCard } from "@/components/settings/email-sender-settings-card"

export default function SettingsGeneralPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Info</CardTitle>
          <CardDescription>
            Update foundational details everyone sees inside the workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input id="org-name" defaultValue="Byte Labs" placeholder="Enter name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Time Zone</Label>
            <Select defaultValue="Pacific Time (PT)">
              <SelectTrigger id="timezone" className="w-full">
                <SelectValue placeholder="Select time zone" />
              </SelectTrigger>
              <SelectContent>
                {timeZones.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
                Logo
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2">
                  <Upload className="size-4" />
                  Upload Logo
                </Button>
                <Button variant="ghost">Remove</Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-domain">Workspace Domain</Label>
            <Input id="org-domain" defaultValue="byte.crm" placeholder="Workspace domain" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
            <CardDescription>Who should receive account updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primary-email">Primary Contact Email</Label>
              <Input id="primary-email" type="email" defaultValue="ops@byte.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-email">Support Email</Label>
              <Input id="support-email" type="email" defaultValue="help@byte.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" defaultValue="+1 (555) 204-8832" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Decide who gets notified and how often.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Send alerts to workspace admins.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Summary Frequency</Label>
              <Select defaultValue="daily">
                <SelectTrigger id="frequency" className="w-full">
                  <SelectValue placeholder="Choose frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Notification Types</Label>
              {notificationTypes.map((type) => (
                <label key={type.id} className="flex items-center gap-3 text-sm">
                  <Checkbox defaultChecked={type.id !== "tasks"} />
                  {type.label}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <EmailSenderSettingsCard />
    </div>
  )
}
