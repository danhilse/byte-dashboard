"use client"

import dynamic from "next/dynamic"
import { useSearchParams, useRouter } from "next/navigation"
import { useCallback, useState, useMemo, useEffect } from "react"
import { LayoutGrid, List, Grid3X3 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { workflowColumns, workflowStatusOptions } from "@/components/data-table/columns/workflow-columns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { StatusFilter } from "@/components/common/status-filter"
import { WorkflowCreateDialog } from "@/components/workflows/workflow-create-dialog"
import { WorkflowDetailDialog } from "@/components/workflows/workflow-detail-dialog"
import { allWorkflowStatuses, workflowStatusConfig } from "@/lib/status-config"
import type { Workflow, WorkflowStatus } from "@/types"

const WorkflowsKanbanBoard = dynamic(
  () => import("@/components/kanban/workflows-kanban-board").then((m) => m.WorkflowsKanbanBoard),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[calc(100vh-12rem)] auto-cols-fr grid-flow-col gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-full rounded-lg" />
        ))}
      </div>
    ),
  }
)

type ViewType = "table" | "kanban" | "grid"

export function WorkflowsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const view = (searchParams.get("view") as ViewType) || "kanban"
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<WorkflowStatus[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const filteredWorkflows = useMemo(() => {
    if (selectedStatuses.length === 0) return workflows
    return workflows.filter((workflow) => selectedStatuses.includes(workflow.status))
  }, [workflows, selectedStatuses])

  const updateView = useCallback(
    (newView: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("view", newView)
      router.push(`/workflows?${params.toString()}`)
    },
    [searchParams, router]
  )

  useEffect(() => {
    async function fetchWorkflows() {
      setIsLoading(true)
      setLoadError(null)

      try {
        const response = await fetch("/api/workflows")
        if (!response.ok) {
          throw new Error("Failed to load workflows")
        }

        const data = await response.json()
        setWorkflows(data.workflows ?? [])
      } catch (error) {
        console.error("Error fetching workflows:", error)
        setLoadError("Unable to load workflow executions.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkflows()
  }, [])

  const handleCreateWorkflow = (workflowData: Omit<Workflow, "id" | "createdAt" | "updatedAt">) => {
    const newWorkflow: Workflow = {
      ...workflowData,
      id: `w${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setWorkflows((prev) => [newWorkflow, ...prev])
  }

  const handleUpdateWorkflow = (updatedWorkflow: Workflow) => {
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === updatedWorkflow.id ? { ...updatedWorkflow, updatedAt: new Date().toISOString() } : w
      )
    )
    setSelectedWorkflow(updatedWorkflow)
  }

  const handleDeleteWorkflow = (workflowId: string) => {
    setWorkflows((prev) => prev.filter((w) => w.id !== workflowId))
  }

  const handleWorkflowClick = (workflow: Workflow) => {
    setSelectedWorkflow(workflow)
    setDetailOpen(true)
  }

  const handleStatusChange = (workflowId: string, newStatus: WorkflowStatus) => {
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === workflowId ? { ...w, status: newStatus, updatedAt: new Date().toISOString() } : w
      )
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground">
            Track and manage your workflow instances.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <WorkflowCreateDialog onCreateWorkflow={handleCreateWorkflow} />
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => updateView("table")}
            >
              <List className="mr-2 size-4" />
              Table
            </Button>
            <Button
              variant={view === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => updateView("kanban")}
            >
              <LayoutGrid className="mr-2 size-4" />
              Kanban
            </Button>
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => updateView("grid")}
            >
              <Grid3X3 className="mr-2 size-4" />
              Grid
            </Button>
          </div>
        </div>
      </div>

      <StatusFilter
        allStatuses={allWorkflowStatuses}
        statusConfig={workflowStatusConfig}
        selectedStatuses={selectedStatuses}
        onStatusChange={setSelectedStatuses}
      />

      <div className="flex-1">
        {isLoading && (
          <div className="grid h-[calc(100vh-14rem)] auto-cols-fr grid-flow-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-full rounded-lg" />
            ))}
          </div>
        )}
        {!isLoading && loadError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {loadError}
          </div>
        )}
        {!isLoading && !loadError && view === "table" && (
          <DataTable
            columns={workflowColumns}
            data={filteredWorkflows}
            searchKey="title"
            searchPlaceholder="Search workflows..."
            filterColumn="status"
            filterOptions={workflowStatusOptions}
            onRowClick={(row) => handleWorkflowClick(row.original)}
          />
        )}
        {!isLoading && !loadError && view === "kanban" && (
          <WorkflowsKanbanBoard
            workflows={filteredWorkflows}
            onStatusChange={handleStatusChange}
            onWorkflowClick={handleWorkflowClick}
          />
        )}
        {!isLoading && !loadError && view === "grid" && (
          <WorkflowsGridView
            workflows={filteredWorkflows}
            onWorkflowClick={handleWorkflowClick}
          />
        )}
      </div>

      <WorkflowDetailDialog
        workflow={selectedWorkflow}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdateWorkflow={handleUpdateWorkflow}
        onDeleteWorkflow={handleDeleteWorkflow}
      />
    </div>
  )
}

interface WorkflowsGridViewProps {
  workflows: Workflow[]
  onWorkflowClick: (workflow: Workflow) => void
}

function WorkflowsGridView({ workflows, onWorkflowClick }: WorkflowsGridViewProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {workflows.map((workflow) => {
        const statusConfig = workflowStatusConfig[workflow.status]
        const initials = (workflow.contactName ?? "")
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()

        return (
          <Card
            key={workflow.id}
            className="hover:bg-muted/50 transition-colors cursor-pointer grid-card-optimized"
            onClick={() => onWorkflowClick(workflow)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <Avatar className="size-10">
                  <AvatarImage src={workflow.contactAvatarUrl} alt={workflow.contactName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base line-clamp-1">{workflow.title}</CardTitle>
                  <p className="text-sm text-muted-foreground truncate">{workflow.contactName}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                {workflow.templateName && (
                  <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                    {workflow.templateName}
                  </span>
                )}
              </div>
              {workflow.progress !== undefined && (
                <div className="space-y-1">
                  <Progress value={workflow.progress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {workflow.completedTaskCount ?? 0}/{workflow.taskCount ?? 0} tasks
                  </p>
                </div>
              )}
              {workflow.notes && (
                <CardDescription className="mt-2 line-clamp-2">{workflow.notes}</CardDescription>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
