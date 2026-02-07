"use client"

import dynamic from "next/dynamic"
import { useSearchParams, useRouter } from "next/navigation"
import { useCallback, useState, useMemo, useEffect } from "react"
import { LayoutGrid, List, Grid3X3 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { taskColumns, taskStatusOptions } from "@/components/data-table/columns/task-columns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TaskCreateDialog } from "@/components/tasks/task-create-dialog"
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog"
import { WorkflowTriggerDialog } from "@/components/workflows/workflow-trigger-dialog"
import { AvailableTaskCard } from "@/components/tasks/available-task-card"
import { StatusFilter } from "@/components/common/status-filter"
import { allTaskStatuses, taskStatusConfig } from "@/lib/status-config"
import { useToast } from "@/hooks/use-toast"
import type { Task, TaskStatus } from "@/types"

const KanbanBoard = dynamic(
  () => import("@/components/kanban/kanban-board").then((m) => m.KanbanBoard),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[calc(100vh-12rem)] auto-cols-fr grid-flow-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-full rounded-lg" />
        ))}
      </div>
    ),
  }
)

type ViewType = "table" | "kanban" | "grid"

export function MyWorkContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  const view = (searchParams.get("view") as ViewType) || "kanban"
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [availableTasks, setAvailableTasks] = useState<Task[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [contacts, setContacts] = useState<Array<{ id: string; firstName: string; lastName: string; email?: string }>>([])
  const [isLoadingContacts, setIsLoadingContacts] = useState(true)

  const filteredTasks = useMemo(() => {
    if (selectedStatuses.length === 0) return tasks
    return tasks.filter((task) => selectedStatuses.includes(task.status))
  }, [tasks, selectedStatuses])

  // Fetch tasks on mount
  useEffect(() => {
    async function fetchTasks() {
      setIsLoading(true)
      setLoadError(null)

      try {
        const response = await fetch("/api/tasks")
        if (!response.ok) {
          throw new Error("Failed to load tasks")
        }

        const data = await response.json()
        setTasks(data.tasks ?? [])
      } catch (error) {
        console.error("Error fetching tasks:", error)
        setLoadError("Unable to load tasks.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
  }, [])

  // Fetch available (unclaimed role-based) tasks
  useEffect(() => {
    async function fetchAvailableTasks() {
      try {
        const response = await fetch("/api/tasks?available=true")
        if (response.ok) {
          const data = await response.json()
          setAvailableTasks(data.tasks ?? [])
        }
      } catch (error) {
        console.error("Error fetching available tasks:", error)
      }
    }

    fetchAvailableTasks()
  }, [])

  // Fetch contacts on mount
  useEffect(() => {
    async function fetchContacts() {
      try {
        const response = await fetch("/api/contacts")
        if (response.ok) {
          const data = await response.json()
          setContacts(data.contacts || [])
        }
      } catch (error) {
        console.error("Error fetching contacts:", error)
      } finally {
        setIsLoadingContacts(false)
      }
    }
    fetchContacts()
  }, [])

  const updateView = useCallback(
    (newView: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("view", newView)
      router.push(`/my-work?${params.toString()}`)
    },
    [searchParams, router]
  )

  const handleCreateTask = async (taskData: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      })

      if (!response.ok) {
        throw new Error("Failed to create task")
      }

      const { task } = await response.json()
      setTasks((prev) => [task, ...prev])

      toast({
        title: "Success",
        description: "Task created successfully",
      })
    } catch (error) {
      console.error("Error creating task:", error)
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      // Strip status (must use /status endpoint) and read-only fields
      const { id, orgId, status, createdAt, updatedAt, ...updateFields } = updatedTask
      const response = await fetch(`/api/tasks/${updatedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateFields),
      })

      if (!response.ok) {
        throw new Error("Failed to update task")
      }

      const { task } = await response.json()
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? task : t))
      )
      setSelectedTask(task)

      toast({
        title: "Success",
        description: "Task updated successfully",
      })
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete task")
      }

      setTasks((prev) => prev.filter((t) => t.id !== taskId))

      toast({
        title: "Success",
        description: "Task deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting task:", error)
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const previous = tasks.find((t) => t.id === taskId)
    if (!previous) return

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
      )
    )
    // Also update selectedTask if it's the same one
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) =>
        prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : prev
      )
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update status")
      }

      const result = await response.json()

      // Update with server response
      if (result.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? result.task : t))
        )
        if (selectedTask?.id === taskId) {
          setSelectedTask(result.task)
        }
      }
    } catch (error) {
      // Rollback on error
      console.error("Error updating task status:", error)
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? previous : t))
      )
      if (selectedTask?.id === taskId) {
        setSelectedTask(previous)
      }
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive",
      })
    }
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setDetailOpen(true)
  }

  const handleClaimTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/claim`, {
        method: "PATCH",
      })

      if (response.status === 409) {
        // Already claimed by someone else
        toast({
          title: "Already Claimed",
          description: "This task was just claimed by someone else.",
          variant: "destructive",
        })
        setAvailableTasks((prev) => prev.filter((t) => t.id !== taskId))
        return
      }

      if (!response.ok) {
        throw new Error("Failed to claim task")
      }

      const { task } = await response.json()

      // Move from available to my tasks
      setAvailableTasks((prev) => prev.filter((t) => t.id !== taskId))
      setTasks((prev) => [task, ...prev])

      toast({
        title: "Task Claimed",
        description: "Task has been assigned to you.",
      })
    } catch (error) {
      console.error("Error claiming task:", error)
      toast({
        title: "Error",
        description: "Failed to claim task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleApprove = async (taskId: string, comment?: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      })

      if (!response.ok) {
        throw new Error("Failed to approve task")
      }

      const result = await response.json()

      // Update local state with server response
      if (result.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? result.task : t))
        )
      } else {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: "done" as TaskStatus,
                  outcome: "approved",
                  outcomeComment: comment,
                  completedAt: new Date().toISOString(),
                }
              : t
          )
        )
      }

      toast({
        title: "Task Approved",
        description: result.workflowSignaled
          ? "Workflow has been notified and will continue."
          : "Task approved successfully.",
      })
    } catch (error) {
      console.error("Error approving task:", error)
      toast({
        title: "Error",
        description: "Failed to approve task. Please try again.",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleReject = async (taskId: string, comment?: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      })

      if (!response.ok) {
        throw new Error("Failed to reject task")
      }

      const result = await response.json()

      // Update local state with server response
      if (result.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? result.task : t))
        )
      } else {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: "done" as TaskStatus,
                  outcome: "rejected",
                  outcomeComment: comment,
                  completedAt: new Date().toISOString(),
                }
              : t
          )
        )
      }

      toast({
        title: "Task Rejected",
        description: result.workflowSignaled
          ? "Workflow has been notified and will continue."
          : "Task rejected successfully.",
      })
    } catch (error) {
      console.error("Error rejecting task:", error)
      toast({
        title: "Error",
        description: "Failed to reject task. Please try again.",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleTriggerWorkflow = async (contactId: string) => {
    try {
      const response = await fetch("/api/workflows/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      })

      if (!response.ok) {
        throw new Error("Failed to trigger workflow")
      }

      const result = await response.json()

      toast({
        title: "Workflow Started",
        description: `Applicant review workflow started for contact. Workflow ID: ${result.workflowId}`,
      })
    } catch (error) {
      console.error("Error triggering workflow:", error)
      toast({
        title: "Error",
        description: "Failed to start workflow. Please try again.",
        variant: "destructive",
      })
      throw error
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Work</h1>
          <p className="text-muted-foreground">
            Manage your tasks and track your progress.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isLoadingContacts && contacts.length > 0 && (
            <WorkflowTriggerDialog
              contacts={contacts}
              onTriggerWorkflow={handleTriggerWorkflow}
            />
          )}
          <TaskCreateDialog onCreateTask={handleCreateTask} />
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
        allStatuses={allTaskStatuses}
        statusConfig={taskStatusConfig}
        selectedStatuses={selectedStatuses}
        onStatusChange={setSelectedStatuses}
      />

      {availableTasks.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Available Tasks ({availableTasks.length})
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {availableTasks.map((task) => (
              <AvailableTaskCard
                key={task.id}
                task={task}
                onClaim={handleClaimTask}
              />
            ))}
          </div>
        </div>
      )}

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
            columns={taskColumns}
            data={filteredTasks}
            searchKey="title"
            searchPlaceholder="Search tasks..."
            filterColumn="status"
            filterOptions={taskStatusOptions}
            onRowClick={(row) => handleTaskClick(row.original)}
          />
        )}
        {!isLoading && !loadError && view === "kanban" && (
          <KanbanBoard
            tasks={filteredTasks}
            onStatusChange={handleStatusChange}
            onTaskClick={handleTaskClick}
          />
        )}
        {!isLoading && !loadError && view === "grid" && (
          <TasksGridView tasks={filteredTasks} onTaskClick={handleTaskClick} />
        )}
      </div>

      <TaskDetailDialog
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        onStatusChange={handleStatusChange}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  )
}

interface TasksGridViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

function getPriorityVariant(priority: Task["priority"]) {
  if (priority === "high" || priority === "urgent") return "destructive"
  if (priority === "medium") return "default"
  return "secondary"
}

function TasksGridView({ tasks, onTaskClick }: TasksGridViewProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tasks.map((task) => (
        <Card
          key={task.id}
          className="hover:bg-muted/50 transition-colors cursor-pointer grid-card-optimized"
          onClick={() => onTaskClick(task)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base line-clamp-2">{task.title}</CardTitle>
              <Badge variant={getPriorityVariant(task.priority)}>
                {task.priority}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="line-clamp-2">{task.description}</CardDescription>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{task.status}</Badge>
              {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
