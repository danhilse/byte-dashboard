import { notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { User, Calendar, Zap, Globe, Workflow as WorkflowIcon } from "lucide-react"
import { auth } from "@clerk/nextjs/server"

import { PageHeader } from "@/components/layout/page-header"
import { DetailHeader } from "@/components/detail/detail-header"
import { ActivityFeed } from "@/components/detail/activity-feed"
import { NotesSection } from "@/components/detail/notes-section"
import { InfoField } from "@/components/common/info-field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/db"
import { workflows, contacts, workflowDefinitions } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { workflowStatusConfig } from "@/lib/status-config"
import { getActivitiesByEntity, getNotesByEntity } from "@/lib/data/activity"
import { PhaseProgressStepper } from "@/components/workflows/phase-progress-stepper"
import type { WorkflowStatus, WorkflowPhase, WorkflowStep } from "@/types"

interface WorkflowDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function WorkflowDetailPage({ params }: WorkflowDetailPageProps) {
  const { userId, orgId } = await auth()
  const { id } = await params

  if (!userId || !orgId) {
    notFound()
  }

  // Fetch workflow with joins
  const [result] = await db
    .select({
      workflow: workflows,
      contact: contacts,
      definitionName: workflowDefinitions.name,
      definitionPhases: workflowDefinitions.phases,
      definitionSteps: workflowDefinitions.steps,
    })
    .from(workflows)
    .leftJoin(contacts, eq(workflows.contactId, contacts.id))
    .leftJoin(
      workflowDefinitions,
      eq(workflows.workflowDefinitionId, workflowDefinitions.id)
    )
    .where(and(eq(workflows.id, id), eq(workflows.orgId, orgId)))

  if (!result) {
    notFound()
  }

  const { workflow, contact, definitionName, definitionPhases, definitionSteps } = result
  const parsedPhases = (definitionPhases as WorkflowPhase[] | null) ?? []
  const parsedSteps = (definitionSteps as { steps: WorkflowStep[] } | null)?.steps ?? []
  const contactName = contact
    ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim()
    : "Unknown Contact"
  const statusConfig = workflowStatusConfig[workflow.status as WorkflowStatus]
  const displayTitle = definitionName
    ? `${definitionName} - ${contactName}`
    : contactName

  // TODO: Replace with DB queries when notes/activity CRUD is implemented (Phase 6)
  const activities = getActivitiesByEntity("workflow", id)
  const notes = getNotesByEntity("workflow", id)

  const sourceLabels: Record<string, string> = {
    manual: "Manual",
    formstack: "Formstack",
    api: "API",
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Workflows", href: "/workflows" },
          { label: displayTitle },
        ]}
      />
      <div className="flex flex-1 flex-col gap-6 p-4">
        <DetailHeader
          title={displayTitle}
          subtitle={`Contact: ${contactName}`}
          badge={statusConfig ? {
            label: statusConfig.label,
            variant: statusConfig.variant,
          } : undefined}
        />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {definitionName && (
                    <div className="flex items-center gap-3">
                      <WorkflowIcon className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Definition</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{definitionName}</Badge>
                          {workflow.definitionVersion && (
                            <span className="text-xs text-muted-foreground">v{workflow.definitionVersion}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Globe className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Source</p>
                      <Badge variant="secondary">
                        {sourceLabels[workflow.source] ?? workflow.source}
                      </Badge>
                    </div>
                  </div>
                  {workflow.temporalWorkflowId && (
                    <div className="flex items-center gap-3">
                      <Zap className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Temporal</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {workflow.temporalWorkflowId}
                        </p>
                        {workflow.temporalRunId && (
                          <p className="text-xs text-muted-foreground font-mono">
                            Run: {workflow.temporalRunId}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {parsedPhases.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <WorkflowIcon className="size-4 text-muted-foreground" />
                        Phase Progress
                      </p>
                      <PhaseProgressStepper
                        phases={parsedPhases}
                        steps={parsedSteps}
                        currentStepId={workflow.currentStepId}
                        workflowStatus={workflow.status as WorkflowStatus}
                      />
                    </div>
                  ) : (
                    <>
                      {workflow.currentStepId && (
                        <InfoField
                          icon={WorkflowIcon}
                          label="Current Step"
                          value={workflow.currentStepId}
                        />
                      )}
                      {workflow.currentPhaseId && (
                        <InfoField
                          icon={WorkflowIcon}
                          label="Current Phase"
                          value={workflow.currentPhaseId}
                        />
                      )}
                    </>
                  )}
                  <InfoField
                    icon={Calendar}
                    label="Started"
                    value={format(new Date(workflow.startedAt), "MMMM d, yyyy")}
                  />
                  {workflow.completedAt && (
                    <InfoField
                      icon={Calendar}
                      label="Completed"
                      value={format(new Date(workflow.completedAt), "MMMM d, yyyy")}
                    />
                  )}
                  <InfoField
                    icon={Calendar}
                    label="Last Updated"
                    value={format(new Date(workflow.updatedAt), "MMMM d, yyyy")}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {contact ? (
                    <Link
                      href={`/people/${contact.id}`}
                      className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted"
                    >
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="size-5" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </p>
                        {contact.role && (
                          <p className="text-sm text-muted-foreground">{contact.role}</p>
                        )}
                        {contact.company && (
                          <p className="text-sm text-muted-foreground">{contact.company}</p>
                        )}
                        {contact.email && (
                          <p className="mt-2 text-sm text-muted-foreground">{contact.email}</p>
                        )}
                        {contact.phone && (
                          <p className="text-sm text-muted-foreground">{contact.phone}</p>
                        )}
                      </div>
                    </Link>
                  ) : (
                    <p className="text-sm text-muted-foreground">Contact not found.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notes">
            <NotesSection notes={notes} />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityFeed activities={activities} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
