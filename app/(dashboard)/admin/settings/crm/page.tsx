import { GripVertical, PencilLine, Trash2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { customFields, fieldGroups } from "@/lib/data/settings"

export default function SettingsCrmPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Custom Fields</CardTitle>
            <CardDescription>Design fields that reflect your CRM motion.</CardDescription>
          </div>
          <Button>Add Custom Field</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {customFields.map((field) => (
            <div key={field.name} className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
              <GripVertical className="size-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{field.name}</p>
                <p className="text-sm text-muted-foreground">Drag to reorder fields across pipelines.</p>
              </div>
              <Badge variant="secondary">{field.type}</Badge>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Required</span>
                <Switch defaultChecked={field.required} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon-sm">
                  <PencilLine className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" className="text-destructive">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Field Groups</CardTitle>
            <CardDescription>Bundle related fields for faster data entry.</CardDescription>
          </div>
          <Button variant="outline">Create Group</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {fieldGroups.map((group) => (
            <div key={group.name} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{group.name}</p>
                <p className="text-sm text-muted-foreground">{group.fields} fields</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Edit
                </Button>
                <Button variant="ghost" size="sm">
                  View Fields
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
