import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { fieldGroups, layoutPresets, widgetOptions } from "@/lib/data/settings"

export default function SettingsCustomizationsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Experience</CardTitle>
          <CardDescription>Tailor widgets, layouts, and themes for every team.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Widget Management</Label>
            <div className="grid gap-3 md:grid-cols-2">
              {widgetOptions.map((widget) => (
                <div key={widget.id} className="flex items-center justify-between rounded-lg border p-3">
                  <p className="text-sm font-medium">{widget.label}</p>
                  <Switch defaultChecked />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Layout Presets</Label>
            <div className="grid gap-3 md:grid-cols-3">
              {layoutPresets.map((preset) => (
                <div key={preset.id} className="rounded-lg border p-4">
                  <p className="font-medium">{preset.label}</p>
                  <p className="text-sm text-muted-foreground">{preset.description}</p>
                  <Button variant="outline" size="sm" className="mt-4 w-full">
                    Apply
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select defaultValue="system">
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="System" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Density</Label>
              <Select defaultValue="balanced">
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Balanced" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Forms & Branding</CardTitle>
          <CardDescription>Ensure public forms match your visual identity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brand-color">Brand Color</Label>
              <Input id="brand-color" type="text" defaultValue="#2563EB" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="button-style">Button Style</Label>
              <Select defaultValue="rounded">
                <SelectTrigger id="button-style" className="w-full">
                  <SelectValue placeholder="Choose style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rounded">Rounded</SelectItem>
                  <SelectItem value="pill">Pill</SelectItem>
                  <SelectItem value="sharp">Sharp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Custom CSS</Label>
            <Textarea
              rows={5}
              placeholder={`/* Add optional overrides */
:root {
  --byte-accent: #2563EB;
}`}
            />
          </div>
          <div className="space-y-3">
            <Label>Field Grouping</Label>
            <div className="grid gap-3 md:grid-cols-2">
              {fieldGroups.map((group) => (
                <label key={group.name} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{group.name}</p>
                    <p className="text-muted-foreground">{group.fields} fields</p>
                  </div>
                  <Switch defaultChecked />
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
