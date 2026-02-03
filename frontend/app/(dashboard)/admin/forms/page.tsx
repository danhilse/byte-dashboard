import { FileEdit, Plus } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function FormBuilderPage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Administration", href: "/settings" }, { label: "Form Builder" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Form Builder</h1>
            <p className="text-muted-foreground">
              Create and manage custom forms for your organization.
            </p>
          </div>
          <Button>
            <Plus className="mr-2 size-4" />
            New Form
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileEdit className="size-5" />
              Forms Library
            </CardTitle>
            <CardDescription>
              Your custom forms and form templates.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-[300px] items-center justify-center">
            <div className="text-center text-muted-foreground">
              <FileEdit className="mx-auto mb-4 size-12 opacity-50" />
              <p>No forms created yet.</p>
              <p className="text-sm">Create your first custom form to get started.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
