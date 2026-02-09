import { notFound } from "next/navigation"
import { and, eq } from "drizzle-orm"
import { Save } from "lucide-react"
import { auth } from "@clerk/nextjs/server"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/db"
import { workflowDefinitions } from "@/lib/db/schema"
import type { DefinitionStatus } from "@/types"

interface WorkflowBuilderEditorPageProps {
  params: Promise<{ id: string }>
}

export default async function WorkflowBuilderEditorPage({
  params,
}: WorkflowBuilderEditorPageProps) {
  const { userId, orgId } = await auth()
  const { id } = await params

  if (!userId || !orgId) {
    notFound()
  }

  const [definition] = await db
    .select({
      id: workflowDefinitions.id,
      name: workflowDefinitions.name,
      description: workflowDefinitions.description,
      version: workflowDefinitions.version,
      statuses: workflowDefinitions.statuses,
      steps: workflowDefinitions.steps,
      createdAt: workflowDefinitions.createdAt,
      updatedAt: workflowDefinitions.updatedAt,
      isActive: workflowDefinitions.isActive,
    })
    .from(workflowDefinitions)
    .where(
      and(
        eq(workflowDefinitions.id, id),
        eq(workflowDefinitions.orgId, orgId),
        eq(workflowDefinitions.isActive, true)
      )
    )

  if (!definition) {
    notFound()
  }

  const statuses = Array.isArray(definition.statuses)
    ? (definition.statuses as DefinitionStatus[])
    : []
  const steps = Array.isArray(definition.steps) ? definition.steps : []

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/settings" },
          { label: "Workflow Builder", href: "/admin/workflow-builder" },
          { label: definition.name },
        ]}
        actions={
          <Button size="sm" disabled>
            <Save className="mr-2 size-4" />
            Save (Phase 2)
          </Button>
        }
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{definition.name}</h1>
          <p className="text-muted-foreground">
            {definition.description || "No description provided."}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Definition Summary</CardTitle>
              <CardDescription>Current production metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Version</span>
                <Badge variant="secondary">v{definition.version}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Statuses</span>
                <span>{statuses.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Runtime Steps</span>
                <span>{steps.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{new Date(definition.updatedAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Inline Editor</CardTitle>
              <CardDescription>
                Phase 1 shell is live. Phase 2 will mount the V2 builder canvas and full save flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This route is now the production destination for workflow definition editing.
              </p>
              <div className="rounded-md border bg-muted/20 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Current statuses
                </p>
                <div className="flex flex-wrap gap-2">
                  {statuses.length > 0 ? (
                    [...statuses]
                      .sort((a, b) => a.order - b.order)
                      .map((status) => (
                        <Badge key={status.id} variant="outline">
                          {status.label}
                        </Badge>
                      ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No statuses configured.</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
