"use client"

import dynamic from "next/dynamic"
import { useState, useMemo, useEffect, useCallback } from "react"
import { LayoutGrid, List, Grid3X3, ShieldCheck, Link2 } from "lucide-react"
import { parseISO } from "date-fns"
import type { ColumnDef, SortingState } from "@tanstack/react-table"

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
import { createTaskColumns, taskStatusOptions } from "@/components/data-table/columns/task-columns"
import { ViewToggle, type ViewOption } from "@/components/common/view-toggle"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TaskStatusBadge } from "@/components/common/status-badge"
import { TaskCreateDialog } from "@/components/tasks/task-create-dialog"
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog"
import { ApprovalTaskDecisionDialog } from "@/components/tasks/approval-task-decision-dialog"
import { AvailableTaskCard } from "@/components/tasks/available-task-card"
import { useToast } from "@/hooks/use-toast"
import { usePersistedView } from "@/hooks/use-persisted-view"
import { getTaskLinks, isApprovalTaskDecided } from "@/lib/tasks/presentation"
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
type KanbanScope = "standard" | "approval"
type MyWorkStatusFilter =
  | "all"
  | TaskStatus
  | "needs_review"
  | "decided"

interface OrganizationUserOption {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

const viewOptions: ViewOption[] = [
  { id: "table", label: "Table", icon: List },
  { id: "kanban", label: "Kanban", icon: LayoutGrid },
  { id: "grid", label: "Grid", icon: Grid3X3 },
]

export function MyWorkContent() {
  const { toast } = useToast()
  const [view, setView] = usePersistedView<ViewType>("my-work", "kanban")
  const [kanbanScope, setKanbanScope] = useState<KanbanScope>("standard")
  const [organizationUsers, setOrganizationUsers] = useState<OrganizationUserOption[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<MyWorkStatusFilter>("all")
  const [availableTasks, setAvailableTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedApprovalTaskId, setSelectedApprovalTaskId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [approvalDetailOpen, setApprovalDetailOpen] = useState(false)

  const [sorting, setSorting] = useState<SortingState>(() => {
    try {
      const stored = localStorage.getItem("byte-sort-my-work")
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const handleSortingChange = useCallback((next: SortingState) => {
    setSorting(next)
    try {
      localStorage.setItem("byte-sort-my-work", JSON.stringify(next))
    } catch {
      // localStorage unavailable
    }
  }, [])

  const assigneeNameById = useMemo(() => {
    const map = new Map<string, string>()

    for (const user of organizationUsers) {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
      map.set(user.id, fullName || user.email)
    }

    return map
  }, [organizationUsers])

  const withAssigneeName = useCallback(
    (task: Task): Task => ({
      ...task,
      assignedToName: task.assignedTo ? assigneeNameById.get(task.assignedTo) : undefined,
    }),
    [assigneeNameById]
  )

  const tasksWithAssigneeNames = useMemo(
    () => tasks.map(withAssigneeName),
    [tasks, withAssigneeName]
  )

  const availableTasksWithAssigneeNames = useMemo(
    () => availableTasks.map(withAssigneeName),
    [availableTasks, withAssigneeName]
  )

  const filteredTasks = useMemo(() => {
    let result = tasksWithAssigneeNames

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((task) =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((task) => {
        if (statusFilter === "needs_review") {
          return task.taskType === "approval" && !isApprovalTaskDecided(task)
        }
        if (statusFilter === "decided") {
          return task.taskType === "approval" && isApprovalTaskDecided(task)
        }
        if (task.taskType === "approval") {
          return false
        }
        return task.status === statusFilter
      })
    }

    return result
  }, [tasksWithAssigneeNames, searchQuery, statusFilter])

  const kanbanTasks = useMemo(
    () => filteredTasks.filter((task) => task.taskType === kanbanScope),
    [filteredTasks, kanbanScope]
  )

  const selectedApprovalTask = useMemo(
    () =>
      selectedApprovalTaskId
        ? tasksWithAssigneeNames.find((task) => task.id === selectedApprovalTaskId) ?? null
        : null,
    [selectedApprovalTaskId, tasksWithAssigneeNames]
  )

  // Fetch organization users for assignee name display
  useEffect(() => {
    let cancelled = false

    async function fetchOrganizationUsers() {
      try {
        const response = await fetch("/api/users")
        if (!response.ok) return
        const data = await response.json()

        if (!cancelled && Array.isArray(data.users)) {
          setOrganizationUsers(data.users)
        }
      } catch (error) {
        console.error("Error fetching organization users:", error)
      }
    }

    fetchOrganizationUsers()

    return () => {
      cancelled = true
    }
  }, [])

  // Fetch tasks on mount
  useEffect(() => {
    async function fetchTasks() {
      setIsLoading(true)
      setLoadError(null)

      try {
        const response = await fetch("/api/tasks?assignee=me")
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
      const updateFields = {
        title: updatedTask.title,
        description: updatedTask.description,
        priority: updatedTask.priority,
        assignedTo: updatedTask.assignedTo,
        assignedRole: updatedTask.assignedRole,
        contactId: updatedTask.contactId,
        dueDate: updatedTask.dueDate,
        position: updatedTask.position,
        metadata: updatedTask.metadata,
      }
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
      setSelectedTask(withAssigneeName(task))

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

  const openApprovalTask = useCallback((taskId: string) => {
    setSelectedApprovalTaskId(taskId)
    setApprovalDetailOpen(true)
  }, [])

  const handleDeleteTask = useCallback(async (taskId: string) => {
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
  }, [toast])

  const handleStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
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
          setSelectedTask(withAssigneeName(result.task))
        }
      }
    } catch (error) {
      // Rollback on error
      console.error("Error updating task status:", error)
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? previous : t))
      )
      if (selectedTask?.id === taskId) {
        setSelectedTask(withAssigneeName(previous))
      }
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive",
      })
    }
  }, [selectedTask?.id, tasks, toast, withAssigneeName])

  const handleTaskClick = useCallback((task: Task) => {
    if (task.taskType === "approval") {
      openApprovalTask(task.id)
      return
    }

    setSelectedTask(task)
    setDetailOpen(true)
  }, [openApprovalTask])

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
      setTasks((prev) => {
        const alreadyExists = prev.some((t) => t.id === task.id)
        if (alreadyExists) {
          return prev.map((t) => (t.id === task.id ? task : t))
        }
        return [task, ...prev]
      })

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

  useEffect(() => {
    setSelectedTask((current) => {
      if (!current) return current
      const next = withAssigneeName(current)
      if (next.assignedToName === current.assignedToName) {
        return current
      }
      return next
    })
  }, [withAssigneeName])

  const myWorkColumns: ColumnDef<Task>[] = useMemo(() => {
    const columns = createTaskColumns({
      onOpenTask: handleTaskClick,
      onDeleteTask: (task) => {
        void handleDeleteTask(task.id)
      },
      onStatusChange: (task, status) => {
        void handleStatusChange(task.id, status)
      },
      onReviewApprovalTask: (task) => {
        openApprovalTask(task.id)
      },
    })

    return columns.map((column) => {
      if ("accessorKey" in column && column.accessorKey === "title") {
        return {
          ...column,
          cell: ({ row }) => {
            const task = row.original as Task
            const taskLinks = getTaskLinks(task.metadata)
            return (
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{task.title}</p>
                  {task.taskType === "approval" && (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium">
                      <ShieldCheck className="mr-1 size-3" />
                      Approval
                    </Badge>
                  )}
                </div>
                {task.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {task.description}
                  </p>
                )}
                {taskLinks.length > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Link2 className="size-3" />
                    {taskLinks.length} link
                    {taskLinks.length === 1 ? "" : "s"}
                  </div>
                )}
              </div>
            )
          },
        } satisfies ColumnDef<Task>
      }
      if ("accessorKey" in column && column.accessorKey === "status") {
        return {
          ...column,
          header: "State",
        } satisfies ColumnDef<Task>
      }
      return column
    })
  }, [handleDeleteTask, handleStatusChange, handleTaskClick, openApprovalTask])


  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Work</h1>
          <p className="text-sm text-muted-foreground">
            Manage your tasks and track your progress.
          </p>
        </div>
        <TaskCreateDialog onCreateTask={handleCreateTask} />
      </div>

      {/* Search, filters, and view toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-[200px] lg:w-[300px]"
            />
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as MyWorkStatusFilter)}
            >
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
                <SelectItem value="decided">Decided</SelectItem>
                {taskStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ViewToggle views={viewOptions} value={view} onChange={setView as (value: string) => void} />
        </div>
        {view === "kanban" && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Kanban Scope</span>
            <div className="flex items-center gap-1 rounded-lg border p-1">
              <Button
                size="sm"
                variant={kanbanScope === "standard" ? "secondary" : "ghost"}
                onClick={() => setKanbanScope("standard")}
              >
                Standard
              </Button>
              <Button
                size="sm"
                variant={kanbanScope === "approval" ? "secondary" : "ghost"}
                onClick={() => setKanbanScope("approval")}
              >
                Approval
              </Button>
            </div>
          </div>
        )}
      </div>

      {availableTasks.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Available Tasks ({availableTasks.length})
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {availableTasksWithAssigneeNames.map((task) => (
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
            columns={myWorkColumns}
            data={filteredTasks}
            sorting={sorting}
            onSortingChange={handleSortingChange}
            onRowClick={(row) => handleTaskClick(row.original)}
            rowClassName={(row) =>
              row.original.taskType === "approval"
                ? "border-primary/25 bg-gradient-to-br from-slate-950/5 via-slate-900/4 to-primary/10 hover:bg-gradient-to-br hover:from-slate-950/8 hover:via-slate-900/6 hover:to-primary/14 dark:border-white/20 dark:from-white/10 dark:via-white/6 dark:to-primary/20 dark:hover:from-white/14 dark:hover:via-white/10 dark:hover:to-primary/24"
                : undefined
            }
          />
        )}
        {!isLoading && !loadError && view === "kanban" && (
          kanbanScope === "standard" ? (
            <KanbanBoard
              tasks={kanbanTasks}
              onStatusChange={handleStatusChange}
              onTaskClick={handleTaskClick}
            />
          ) : (
            <ApprovalKanbanQueue
              tasks={kanbanTasks}
              onTaskClick={handleTaskClick}
            />
          )
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
      <ApprovalTaskDecisionDialog
        task={selectedApprovalTask}
        open={approvalDetailOpen}
        onOpenChange={setApprovalDetailOpen}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  )
}

interface ApprovalKanbanQueueProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

function ApprovalKanbanQueue({ tasks, onTaskClick }: ApprovalKanbanQueueProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        No approval tasks match your current filters.
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-background to-emerald-50/40 p-3 dark:border-amber-900/40 dark:from-amber-950/20 dark:via-background dark:to-emerald-950/15">
      <p className="text-xs text-muted-foreground">
        Approval tasks are reviewed in a decision modal instead of drag-and-drop.
      </p>
      {tasks.map((task) => {
        const links = getTaskLinks(task.metadata)

        return (
          <button
            key={task.id}
            type="button"
            className="flex w-full items-center justify-between rounded-md border border-amber-200/60 bg-background/70 px-3 py-2 text-left transition-colors hover:bg-background dark:border-amber-900/40"
            onClick={() => onTaskClick(task)}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                {task.outcome ? `Outcome: ${task.outcome}` : "Awaiting decision"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {links.length > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  <Link2 className="mr-1 size-3" />
                  {links.length}
                </Badge>
              )}
              <TaskStatusBadge
                status={task.status}
                taskType={task.taskType}
                outcome={task.outcome ?? null}
              />
            </div>
          </button>
        )
      })}
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
      {tasks.map((task) => {
        const links = getTaskLinks(task.metadata)

        return (
          <Card
            key={task.id}
            className={`cursor-pointer transition-colors hover:bg-muted/50 grid-card-optimized ${
              task.taskType === "approval"
                ? "border-primary/25 bg-gradient-to-br from-slate-950/5 via-slate-900/4 to-primary/10 dark:border-white/20 dark:from-white/10 dark:via-white/6 dark:to-primary/20"
                : ""
            }`}
            onClick={() => onTaskClick(task)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="line-clamp-2 text-base">{task.title}</CardTitle>
                  {task.taskType === "approval" && (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium">
                      <ShieldCheck className="mr-1 size-3" />
                      Approval
                    </Badge>
                  )}
                </div>
                <Badge variant={getPriorityVariant(task.priority)}>
                  {task.priority}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="line-clamp-2">{task.description}</CardDescription>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <TaskStatusBadge
                  status={task.status}
                  taskType={task.taskType}
                  outcome={task.outcome ?? null}
                />
                {task.dueDate && <span>Due: {parseISO(task.dueDate).toLocaleDateString()}</span>}
                {links.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Link2 className="size-3" />
                    {links.length}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
