import { notFound } from "next/navigation"
import { and, desc, eq, sql } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

import { PageHeader } from "@/components/layout/page-header"
import {
  WorkflowDefinitionsIndex,
  type WorkflowDefinitionListItem,
} from "@/components/workflow-builder/workflow-definitions-index"
import { db } from "@/lib/db"
import { workflowDefinitions, workflowExecutions } from "@/lib/db/schema"
import type { DefinitionStatus } from "@/types"

export default async function WorkflowBuilderPage() {
  const { userId, orgId } = await auth()

  if (!userId || !orgId) {
    notFound()
  }

  const definitions = await db
    .select({
      id: workflowDefinitions.id,
      name: workflowDefinitions.name,
      description: workflowDefinitions.description,
      version: workflowDefinitions.version,
      statuses: workflowDefinitions.statuses,
      runsCount: sql<number>`count(${workflowExecutions.id})::int`,
      isActive: workflowDefinitions.isActive,
      createdAt: workflowDefinitions.createdAt,
      updatedAt: workflowDefinitions.updatedAt,
    })
    .from(workflowDefinitions)
    .leftJoin(
      workflowExecutions,
      and(
        eq(workflowExecutions.workflowDefinitionId, workflowDefinitions.id),
        eq(workflowExecutions.orgId, orgId)
      )
    )
    .where(
      and(
        eq(workflowDefinitions.orgId, orgId),
        eq(workflowDefinitions.isActive, true)
      )
    )
    .groupBy(
      workflowDefinitions.id,
      workflowDefinitions.name,
      workflowDefinitions.description,
      workflowDefinitions.version,
      workflowDefinitions.statuses,
      workflowDefinitions.isActive,
      workflowDefinitions.createdAt,
      workflowDefinitions.updatedAt
    )
    .orderBy(desc(workflowDefinitions.updatedAt))

  const initialDefinitions: WorkflowDefinitionListItem[] = definitions.map(
    (definition) => ({
      id: definition.id,
      name: definition.name,
      description: definition.description ?? undefined,
      version: definition.version,
      statuses: Array.isArray(definition.statuses)
        ? (definition.statuses as DefinitionStatus[])
        : [],
      runsCount: Number(definition.runsCount ?? 0),
      isActive: definition.isActive,
      createdAt: definition.createdAt.toISOString(),
      updatedAt: definition.updatedAt.toISOString(),
    })
  )

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/settings" },
          { label: "Workflow Builder" },
        ]}
      />
      <WorkflowDefinitionsIndex initialDefinitions={initialDefinitions} />
    </>
  )
}
