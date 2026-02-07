"use client"

import dynamic from "next/dynamic"
import { useSearchParams, useRouter } from "next/navigation"
import { useCallback, useState, useMemo, useEffect } from "react"
import { LayoutGrid, List, Grid3X3 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { workflowColumns, workflowStatusOptions } from "@/components/data-table/columns/workflow-columns"
import { StatusFilter } from "@/components/common/status-filter"
import { WorkflowCreateDialog } from "@/components/workflows/workflow-create-dialog"
import { WorkflowDetailDialog } from "@/components/workflows/workflow-detail-dialog"
import { WorkflowDeleteDialog } from "@/components/workflows/workflow-delete-dialog"
import { allWorkflowStatuses, workflowStatusConfig } from "@/lib/status-config"
import { useToast } from "@/hooks/use-toast"
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
  const { toast } = useToast()

  const view = (searchParams.get("view") as ViewType) || "kanban"
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<WorkflowStatus[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deletingWorkflow, setDeletingWorkflow] = useState<Workflow | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

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

  const handleCreateWorkflow = async (data: {
    contactId: string
    workflowDefinitionId?: string
    status: WorkflowStatus
  }) => {
    try {
      const startsImmediately = Boolean(data.workflowDefinitionId)
      const endpoint = startsImmediately ? "/api/workflows/trigger" : "/api/workflows"
      const payload = startsImmediately
        ? {
            contactId: data.contactId,
            workflowDefinitionId: data.workflowDefinitionId,
          }
        : data

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(
          startsImmediately
            ? "Failed to start workflow"
            : "Failed to create workflow"
        )
      }

      const { workflow } = await response.json()
      if (!workflow) {
        throw new Error("Workflow response was missing payload")
      }
      setWorkflows((prev) => [workflow, ...prev])

      toast({
        title: startsImmediately ? "Workflow started" : "Success",
        description: startsImmediately
          ? "Workflow execution started successfully"
          : "Workflow created successfully",
      })
    } catch (error) {
      console.error("Error creating workflow:", error)
      toast({
        title: "Error",
        description: error instanceof Error
          ? error.message
          : "Failed to create workflow. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateWorkflow = async (updatedWorkflow: Workflow) => {
    try {
      const response = await fetch(`/api/workflows/${updatedWorkflow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedWorkflow),
      })

      if (!response.ok) {
        throw new Error("Failed to update workflow")
      }

      const { workflow } = await response.json()
      // Merge the API response with joined fields from the local state
      const existing = workflows.find((w) => w.id === workflow.id)
      const merged = {
        ...workflow,
        contactName: existing?.contactName ?? updatedWorkflow.contactName,
        contactAvatarUrl: existing?.contactAvatarUrl ?? updatedWorkflow.contactAvatarUrl,
        definitionName: existing?.definitionName ?? updatedWorkflow.definitionName,
      }

      setWorkflows((prev) =>
        prev.map((w) => (w.id === merged.id ? merged : w))
      )
      setSelectedWorkflow(merged)

      toast({
        title: "Success",
        description: "Workflow updated successfully",
      })
    } catch (error) {
      console.error("Error updating workflow:", error)
      toast({
        title: "Error",
        description: "Failed to update workflow. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteWorkflow = (workflowId: string) => {
    const workflow = workflows.find((w) => w.id === workflowId)
    if (workflow) {
      setDeletingWorkflow(workflow)
      setDeleteDialogOpen(true)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingWorkflow) return

    try {
      const response = await fetch(`/api/workflows/${deletingWorkflow.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || "Failed to delete workflow")
      }

      setWorkflows((prev) => prev.filter((w) => w.id !== deletingWorkflow.id))
      setDeleteDialogOpen(false)
      setDeletingWorkflow(null)
      setDetailOpen(false)
      setSelectedWorkflow(null)

      toast({
        title: "Success",
        description: "Workflow deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting workflow:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete workflow. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleWorkflowClick = (workflow: Workflow) => {
    setSelectedWorkflow(workflow)
    setDetailOpen(true)
  }

  const handleStatusChange = async (workflowId: string, newStatus: WorkflowStatus) => {
    const previous = workflows.find((w) => w.id === workflowId)
    if (!previous) return

    if (previous.temporalWorkflowId) {
      toast({
        title: "Status is Temporal-managed",
        description: "Use workflow actions/signals to change status for Temporal-managed workflows.",
        variant: "destructive",
      })
      return
    }

    // Optimistic update
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === workflowId ? { ...w, status: newStatus, updatedAt: new Date().toISOString() } : w
      )
    )

    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || "Failed to update status")
      }
    } catch (error) {
      // Rollback on error
      console.error("Error updating workflow status:", error)
      setWorkflows((prev) =>
        prev.map((w) => (w.id === workflowId ? previous : w))
      )
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update workflow status.",
        variant: "destructive",
      })
    }
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
            searchKey="contactName"
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

      <WorkflowDeleteDialog
        workflow={deletingWorkflow}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
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

        const displayName = workflow.definitionName
          ? `${workflow.definitionName}`
          : "Manual Workflow"

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
                  <CardTitle className="text-base line-clamp-1">{workflow.contactName ?? "Unknown"}</CardTitle>
                  <p className="text-sm text-muted-foreground truncate">{displayName}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                <Badge variant="secondary" className="text-xs">
                  {workflow.source === "manual" ? "Manual" : workflow.source === "formstack" ? "Formstack" : "API"}
                </Badge>
              </div>
              {workflow.startedAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Started {new Date(workflow.startedAt).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
