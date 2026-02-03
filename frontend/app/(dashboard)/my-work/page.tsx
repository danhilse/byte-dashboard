"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { LayoutGrid, List, Grid3X3 } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import { DataTable } from "@/components/data-table/data-table"
import { taskColumns, taskStatusOptions } from "@/components/data-table/columns/task-columns"
import { applicationColumns, applicationStatusOptions } from "@/components/data-table/columns/application-columns"
import { tasks } from "@/lib/data/tasks"
import { applications } from "@/lib/data/applications"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type ViewType = "table" | "kanban" | "grid"
type TabType = "tasks" | "applications"

export default function MyWorkPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const tab = (searchParams.get("tab") as TabType) || "tasks"
  const view = (searchParams.get("view") as ViewType) || "kanban"

  const updateParams = (updates: { tab?: string; view?: string }) => {
    const params = new URLSearchParams(searchParams.toString())
    if (updates.tab) params.set("tab", updates.tab)
    if (updates.view) params.set("view", updates.view)
    router.push(`/my-work?${params.toString()}`)
  }

  return (
    <>
      <PageHeader breadcrumbs={[{ label: "My Work" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Work</h1>
            <p className="text-muted-foreground">
              Manage your tasks and applications in one place.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => updateParams({ view: "table" })}
            >
              <List className="mr-2 size-4" />
              Table
            </Button>
            <Button
              variant={view === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => updateParams({ view: "kanban" })}
            >
              <LayoutGrid className="mr-2 size-4" />
              Kanban
            </Button>
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => updateParams({ view: "grid" })}
            >
              <Grid3X3 className="mr-2 size-4" />
              Grid
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(value) => updateParams({ tab: value })}>
          <TabsList>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-4">
            {view === "table" && (
              <DataTable
                columns={taskColumns}
                data={tasks}
                searchKey="title"
                searchPlaceholder="Search tasks..."
                filterColumn="status"
                filterOptions={taskStatusOptions}
              />
            )}
            {view === "kanban" && <KanbanBoard initialTasks={tasks} />}
            {view === "grid" && <TasksGridView />}
          </TabsContent>

          <TabsContent value="applications" className="mt-4">
            {view === "table" && (
              <DataTable
                columns={applicationColumns}
                data={applications}
                searchKey="title"
                searchPlaceholder="Search applications..."
                filterColumn="status"
                filterOptions={applicationStatusOptions}
              />
            )}
            {view === "kanban" && <ApplicationsKanbanView />}
            {view === "grid" && <ApplicationsGridView />}
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

function TasksGridView() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tasks.map((task) => (
        <Card key={task.id} className="hover:bg-muted/50 transition-colors">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base line-clamp-2">{task.title}</CardTitle>
              <Badge variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "secondary"}>
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

function ApplicationsGridView() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {applications.map((app) => (
        <Card key={app.id} className="hover:bg-muted/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base line-clamp-2">{app.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="line-clamp-2">{app.notes || "No notes"}</CardDescription>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{app.status}</Badge>
              <span>{app.contactName}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ApplicationsKanbanView() {
  // Placeholder for applications kanban - can be expanded later
  return (
    <div className="rounded-lg border bg-muted/50 p-8 text-center">
      <p className="text-muted-foreground">
        Kanban view for applications coming soon. Switch to Table or Grid view.
      </p>
    </div>
  )
}
