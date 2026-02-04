import { GitBranch, Plus } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function WorkflowBlueprintsPage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Administration", href: "/settings" }, { label: "Workflow Blueprints" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Workflow Blueprints</h1>
            <p className="text-muted-foreground">
              Manage and create reusable workflow templates.
            </p>
          </div>
          <Button>
            <Plus className="mr-2 size-4" />
            New Blueprint
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="size-5" />
              Blueprints Library
            </CardTitle>
            <CardDescription>
              Your saved workflow blueprints and templates.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-[300px] items-center justify-center">
            <div className="text-center text-muted-foreground">
              <GitBranch className="mx-auto mb-4 size-12 opacity-50" />
              <p>No blueprints created yet.</p>
              <p className="text-sm">Create your first workflow blueprint to get started.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
