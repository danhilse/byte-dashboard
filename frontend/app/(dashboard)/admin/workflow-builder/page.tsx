import { Workflow, Save, Play } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function WorkflowBuilderPage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Administration", href: "/settings" }, { label: "Workflow Builder" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Workflow Builder</h1>
            <p className="text-muted-foreground">
              Design and build automated workflows visually.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Play className="mr-2 size-4" />
              Test
            </Button>
            <Button>
              <Save className="mr-2 size-4" />
              Save Workflow
            </Button>
          </div>
        </div>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="size-5" />
              Visual Workflow Editor
            </CardTitle>
            <CardDescription>
              Drag and drop nodes to build your workflow logic.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-[500px] items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Workflow className="mx-auto mb-4 size-12 opacity-50" />
              <p>Workflow builder canvas coming soon.</p>
              <p className="text-sm">This will be a visual drag-and-drop workflow editor.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
