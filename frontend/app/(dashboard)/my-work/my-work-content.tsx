"use client"

import dynamic from "next/dynamic"
import { useSearchParams, useRouter } from "next/navigation"
import { useCallback, useState, useMemo } from "react"
import { LayoutGrid, List, Grid3X3 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { taskColumns, taskStatusOptions } from "@/components/data-table/columns/task-columns"
import { tasks as initialTasks } from "@/lib/data/tasks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TaskCreateDialog, TaskDetailDialog } from "@/components/tasks"
import { StatusFilter } from "@/components/common/status-filter"
import { allTaskStatuses, taskStatusConfig } from "@/lib/status-config"
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

  const view = (searchParams.get("view") as ViewType) || "kanban"
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const filteredTasks = useMemo(() => {
    if (selectedStatuses.length === 0) return tasks
    return tasks.filter((task) => selectedStatuses.includes(task.status))
  }, [tasks, selectedStatuses])

  const updateView = useCallback(
    (newView: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("view", newView)
      router.push(`/my-work?${params.toString()}`)
    },
    [searchParams, router]
  )

  const handleCreateTask = (taskData: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
    const newTask: Task = {
      ...taskData,
      id: `t${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setTasks((prev) => [newTask, ...prev])
  }

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === updatedTask.id ? { ...updatedTask, updatedAt: new Date().toISOString() } : t
      )
    )
    setSelectedTask(updatedTask)
  }

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setDetailOpen(true)
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

      <div className="flex-1">
        {view === "table" && (
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
        {view === "kanban" && <KanbanBoard initialTasks={filteredTasks} />}
        {view === "grid" && (
          <TasksGridView tasks={filteredTasks} onTaskClick={handleTaskClick} />
        )}
      </div>

      <TaskDetailDialog
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
      />
    </div>
  )
}

interface TasksGridViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
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
              <Badge variant={task.priority === "high" || task.priority === "urgent" ? "destructive" : task.priority === "medium" ? "default" : "secondary"}>
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
