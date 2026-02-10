"use client"

import dynamic from "next/dynamic"
import { useState, useMemo, useEffect, useCallback } from "react"
import { LayoutGrid, List, Grid3X3 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable } from "@/components/data-table/data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { createWorkflowColumns } from "@/components/data-table/columns/workflow-columns"
import { WorkflowCreateDialog } from "@/components/workflows/workflow-create-dialog"
import { WorkflowDetailDialog } from "@/components/workflows/workflow-detail-dialog"
import { WorkflowDeleteDialog } from "@/components/workflows/workflow-delete-dialog"
import {
  workflowExecutionStateOptions,
  resolveWorkflowStatusDisplay,
} from "@/lib/status-config"
import { useToast } from "@/hooks/use-toast"
import { usePersistedView } from "@/hooks/use-persisted-view"
import type { WorkflowExecution, DefinitionStatus } from "@/types"

interface DefinitionOption {
  id: string
  name: string
  statuses?: DefinitionStatus[]
}

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
  const { toast } = useToast()
  const [view, setView] = usePersistedView<ViewType>("workflows", "kanban")
  const [workflows, setWorkflows] = useState<WorkflowExecution[]>([])
  const [definitions, setDefinitions] = useState<DefinitionOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [definitionFilter, setDefinitionFilter] = useState<string>("all")
  const [stateFilter, setStateFilter] = useState<string>("all")
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowExecution | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deletingWorkflow, setDeletingWorkflow] = useState<WorkflowExecution | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [rerunningWorkflowId, setRerunningWorkflowId] = useState<string | null>(null)

  // Derive active definition statuses from selected definition
  const selectedDefinition = useMemo(
    () => (definitionFilter !== "all" ? definitions.find((d) => d.id === definitionFilter) : null),
    [definitionFilter, definitions]
  )
  const activeDefinitionStatuses = selectedDefinition?.statuses

  const filteredWorkflows = useMemo(() => {
    let result = workflows

    // Apply definition filter
    if (definitionFilter !== "all") {
      result = result.filter((w) => w.workflowDefinitionId === definitionFilter)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((workflow) =>
        (workflow.contactName?.toLowerCase().includes(query)) ||
        (workflow.definitionName?.toLowerCase().includes(query))
      )
    }

    // Apply execution state filter
    if (stateFilter !== "all") {
      result = result.filter(
        (workflow) => workflow.workflowExecutionState === stateFilter
      )
    }

    return result
  }, [workflows, definitionFilter, searchQuery, stateFilter])


  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      setLoadError(null)

      try {
        const [workflowsRes, definitionsRes] = await Promise.all([
          fetch("/api/workflows"),
          fetch("/api/workflow-definitions"),
        ])

        if (!workflowsRes.ok) {
          throw new Error("Failed to load workflows")
        }

        const workflowsData = await workflowsRes.json()
        setWorkflows(workflowsData.workflows ?? [])

        if (definitionsRes.ok) {
          const defsData = await definitionsRes.json()
          setDefinitions(defsData.definitions ?? [])
        }
      } catch (error) {
        console.error("Error fetching workflows:", error)
        setLoadError("Unable to load workflow executions.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleCreateWorkflow = async (data: {
    contactId: string
    workflowDefinitionId?: string
    status?: string
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

  const handleUpdateWorkflow = async (updatedWorkflow: WorkflowExecution) => {
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
        definitionStatuses: existing?.definitionStatuses ?? updatedWorkflow.definitionStatuses,
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

  const handleDeleteWorkflow = useCallback((workflowExecutionId: string) => {
    const workflow = workflows.find((w) => w.id === workflowExecutionId)
    if (workflow) {
      setDeletingWorkflow(workflow)
      setDeleteDialogOpen(true)
    }
  }, [workflows])

  const handleRerunWorkflow = useCallback(
    async (workflow: WorkflowExecution) => {
      if (!workflow.workflowDefinitionId) {
        toast({
          title: "Re-run unavailable",
          description: "This execution is not linked to a workflow definition.",
          variant: "destructive",
        })
        return
      }

      if (!workflow.contactId) {
        toast({
          title: "Re-run unavailable",
          description: "This execution is missing a contact reference.",
          variant: "destructive",
        })
        return
      }

      try {
        setRerunningWorkflowId(workflow.id)

        const response = await fetch("/api/workflows/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactId: workflow.contactId,
            workflowDefinitionId: workflow.workflowDefinitionId,
          }),
        })

        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(
            payload?.error ||
            payload?.details ||
            "Failed to re-run workflow"
          )
        }

        const rerunWorkflow = payload?.workflow as WorkflowExecution | undefined
        if (!rerunWorkflow) {
          throw new Error("Workflow response was missing payload")
        }

        setWorkflows((prev) => [rerunWorkflow, ...prev.filter((w) => w.id !== rerunWorkflow.id)])
        setSelectedWorkflow(rerunWorkflow)
        setDetailOpen(true)

        toast({
          title: "Workflow re-run started",
          description: "A new workflow execution has been created.",
        })
      } catch (error) {
        console.error("Error re-running workflow:", error)
        toast({
          title: "Error",
          description: error instanceof Error
            ? error.message
            : "Failed to re-run workflow. Please try again.",
          variant: "destructive",
        })
      } finally {
        setRerunningWorkflowId((current) => (current === workflow.id ? null : current))
      }
    },
    [toast]
  )

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

  const handleWorkflowClick = useCallback((workflow: WorkflowExecution) => {
    setSelectedWorkflow(workflow)
    setDetailOpen(true)
  }, [])

  const workflowColumns = useMemo(
    () =>
      createWorkflowColumns({
        onViewDetails: handleWorkflowClick,
        onRerun: handleRerunWorkflow,
        onDelete: (workflow) => handleDeleteWorkflow(workflow.id),
        rerunningWorkflowId,
      }),
    [handleDeleteWorkflow, handleRerunWorkflow, handleWorkflowClick, rerunningWorkflowId]
  )

  const handleStatusChange = async (workflowExecutionId: string, newStatus: string) => {
    const previous = workflows.find((w) => w.id === workflowExecutionId)
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
        w.id === workflowExecutionId ? { ...w, status: newStatus, updatedAt: new Date().toISOString() } : w
      )
    )

    try {
      const response = await fetch(`/api/workflows/${workflowExecutionId}`, {
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
        prev.map((w) => (w.id === workflowExecutionId ? previous : w))
      )
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update workflow status.",
        variant: "destructive",
      })
    }
  }

  const selectedDefinitionName = selectedDefinition?.name ?? null

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="text-sm text-muted-foreground">
            {selectedDefinitionName
              ? `Viewing ${selectedDefinitionName} instances.`
              : "Track and manage your workflow instances."}
          </p>
        </div>
        <WorkflowCreateDialog onCreateWorkflow={handleCreateWorkflow} />
      </div>

      {/* Definition selector, search, filters, and view toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={definitionFilter} onValueChange={setDefinitionFilter}>
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder="All Workflow Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workflow Types</SelectItem>
              {definitions.map((def) => (
                <SelectItem key={def.id} value={def.id}>
                  {def.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-[200px] lg:w-[300px]"
          />
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {workflowExecutionStateOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("table")}
          >
            <List className="mr-2 size-4" />
            Table
          </Button>
          <Button
            variant={view === "kanban" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("kanban")}
          >
            <LayoutGrid className="mr-2 size-4" />
            Kanban
          </Button>
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("grid")}
          >
            <Grid3X3 className="mr-2 size-4" />
            Grid
          </Button>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {isLoading && (
          <div className="grid h-[calc(100vh-14rem)] auto-cols-[minmax(200px,1fr)] grid-flow-col gap-4 overflow-x-auto">
            {Array.from({ length: 6 }).map((_, i) => (
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
            onRowClick={(row) => handleWorkflowClick(row.original)}
          />
        )}
        {!isLoading && !loadError && view === "kanban" && (
          definitionFilter === "all" ? (
            <div className="flex h-[calc(100vh-14rem)] items-center justify-center rounded-lg border border-dashed">
              <div className="text-center">
                <LayoutGrid className="mx-auto mb-3 size-10 text-muted-foreground" />
                <h3 className="text-lg font-medium">Select a workflow type</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a workflow definition above to view its kanban board with definition-specific status columns.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Use Table or Grid view to see all workflow types at once.
                </p>
              </div>
            </div>
          ) : (
            <WorkflowsKanbanBoard
              workflows={filteredWorkflows}
              definitionStatuses={activeDefinitionStatuses}
              onStatusChange={handleStatusChange}
              onWorkflowClick={handleWorkflowClick}
            />
          )
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
        onRerunWorkflow={handleRerunWorkflow}
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
  workflows: WorkflowExecution[]
  onWorkflowClick: (workflow: WorkflowExecution) => void
}

function WorkflowsGridView({ workflows, onWorkflowClick }: WorkflowsGridViewProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {workflows.map((workflow) => {
        const statusConfig = resolveWorkflowStatusDisplay(
          workflow.status,
          workflow.definitionStatuses
        )
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
                <Badge variant={statusConfig.variant}>
                  {statusConfig.color && (
                    <span
                      className="mr-1.5 inline-block size-2 rounded-full"
                      style={{ backgroundColor: statusConfig.color }}
                    />
                  )}
                  {statusConfig.label}
                </Badge>
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
