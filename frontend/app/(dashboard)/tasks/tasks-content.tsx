"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { LayoutGrid, List } from "lucide-react"

import { KanbanBoard } from "@/components/kanban/kanban-board"
import { DataTable } from "@/components/data-table/data-table"
import { taskColumns, taskStatusOptions } from "@/components/data-table/columns/task-columns"
import { Button } from "@/components/ui/button"
import { tasks } from "@/lib/data/tasks"

export function TasksContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const view = searchParams.get("view") || "kanban"

  const setView = (newView: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("view", newView)
    router.push(`/tasks?${params.toString()}`)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage and track your team's tasks.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant={view === "kanban" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("kanban")}
          >
            <LayoutGrid className="mr-2 size-4" />
            Board
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("list")}
          >
            <List className="mr-2 size-4" />
            List
          </Button>
        </div>
      </div>

      {view === "kanban" ? (
        <KanbanBoard initialTasks={tasks} />
      ) : (
        <DataTable
          columns={taskColumns}
          data={tasks}
          searchKey="title"
          searchPlaceholder="Search tasks..."
          filterColumn="status"
          filterOptions={taskStatusOptions}
        />
      )}
    </div>
  )
}
