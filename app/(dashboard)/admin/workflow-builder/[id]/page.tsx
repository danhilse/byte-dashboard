import { notFound } from "next/navigation"
import { and, eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

import { PageHeader } from "@/components/layout/page-header"
import { WorkflowDefinitionEditor } from "@/components/workflow-builder/workflow-definition-editor"
import { db } from "@/lib/db"
import { workflowDefinitions } from "@/lib/db/schema"

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
      phases: workflowDefinitions.phases,
      steps: workflowDefinitions.steps,
      variables: workflowDefinitions.variables,
      statuses: workflowDefinitions.statuses,
      isActive: workflowDefinitions.isActive,
      createdAt: workflowDefinitions.createdAt,
      updatedAt: workflowDefinitions.updatedAt,
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

  const initialDefinition = {
    ...definition,
    createdAt: definition.createdAt.toISOString(),
    updatedAt: definition.updatedAt.toISOString(),
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/settings" },
          { label: "Workflow Builder", href: "/admin/workflow-builder" },
          { label: definition.name },
        ]}
      />
      <WorkflowDefinitionEditor
        definitionId={definition.id}
        initialDefinition={initialDefinition}
      />
    </>
  )
}
