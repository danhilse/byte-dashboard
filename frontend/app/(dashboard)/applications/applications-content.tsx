"use client"

import dynamic from "next/dynamic"
import { useSearchParams, useRouter } from "next/navigation"
import { useCallback, useState, useMemo } from "react"
import { LayoutGrid, List, Grid3X3 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { applicationColumns, applicationStatusOptions } from "@/components/data-table/columns/application-columns"
import { applications as initialApplications } from "@/lib/data/applications"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ApplicationStatusFilters } from "@/components/applications/application-status-filters"
import { ApplicationCreateDialog } from "@/components/applications/application-create-dialog"
import { ApplicationDetailDialog } from "@/components/applications/application-detail-dialog"
import { applicationStatusConfig } from "@/lib/status-config"
import type { Application, ApplicationStatus } from "@/types"

const ApplicationsKanbanBoard = dynamic(
  () => import("@/components/kanban/applications-kanban-board").then((m) => m.ApplicationsKanbanBoard),
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

export function ApplicationsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const view = (searchParams.get("view") as ViewType) || "kanban"
  const [applications, setApplications] = useState<Application[]>(initialApplications)
  const [selectedStatuses, setSelectedStatuses] = useState<ApplicationStatus[]>([])
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const filteredApplications = useMemo(() => {
    if (selectedStatuses.length === 0) return applications
    return applications.filter((app) => selectedStatuses.includes(app.status))
  }, [applications, selectedStatuses])

  const updateView = useCallback(
    (newView: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("view", newView)
      router.push(`/applications?${params.toString()}`)
    },
    [searchParams, router]
  )

  const handleCreateApplication = (appData: Omit<Application, "id" | "submittedAt" | "updatedAt">) => {
    const newApp: Application = {
      ...appData,
      id: `a${Date.now()}`,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setApplications((prev) => [newApp, ...prev])
  }

  const handleUpdateApplication = (updatedApp: Application) => {
    setApplications((prev) =>
      prev.map((a) =>
        a.id === updatedApp.id ? { ...updatedApp, updatedAt: new Date().toISOString() } : a
      )
    )
    setSelectedApplication(updatedApp)
  }

  const handleDeleteApplication = (appId: string) => {
    setApplications((prev) => prev.filter((a) => a.id !== appId))
  }

  const handleApplicationClick = (app: Application) => {
    setSelectedApplication(app)
    setDetailOpen(true)
  }

  const handleStatusChange = (appId: string, newStatus: ApplicationStatus) => {
    setApplications((prev) =>
      prev.map((a) =>
        a.id === appId ? { ...a, status: newStatus, updatedAt: new Date().toISOString() } : a
      )
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
          <p className="text-muted-foreground">
            Track and manage your application pipeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ApplicationCreateDialog onCreateApplication={handleCreateApplication} />
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

      <ApplicationStatusFilters
        selectedStatuses={selectedStatuses}
        onStatusChange={setSelectedStatuses}
      />

      <div className="flex-1">
        {view === "table" && (
          <DataTable
            columns={applicationColumns}
            data={filteredApplications}
            searchKey="title"
            searchPlaceholder="Search applications..."
            filterColumn="status"
            filterOptions={applicationStatusOptions}
            onRowClick={(row) => handleApplicationClick(row.original)}
          />
        )}
        {view === "kanban" && (
          <ApplicationsKanbanBoard
            applications={filteredApplications}
            onStatusChange={handleStatusChange}
            onApplicationClick={handleApplicationClick}
          />
        )}
        {view === "grid" && (
          <ApplicationsGridView
            applications={filteredApplications}
            onApplicationClick={handleApplicationClick}
          />
        )}
      </div>

      <ApplicationDetailDialog
        application={selectedApplication}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdateApplication={handleUpdateApplication}
        onDeleteApplication={handleDeleteApplication}
      />
    </div>
  )
}

interface ApplicationsGridViewProps {
  applications: Application[]
  onApplicationClick: (app: Application) => void
}

function ApplicationsGridView({ applications, onApplicationClick }: ApplicationsGridViewProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {applications.map((app) => {
        const statusConfig = applicationStatusConfig[app.status]
        const initials = app.contactName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()

        return (
          <Card
            key={app.id}
            className="hover:bg-muted/50 transition-colors cursor-pointer grid-card-optimized"
            onClick={() => onApplicationClick(app)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <Avatar className="size-10">
                  <AvatarImage src={app.contactAvatarUrl} alt={app.contactName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base line-clamp-1">{app.title}</CardTitle>
                  <p className="text-sm text-muted-foreground truncate">{app.contactName}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                {app.workflowName && (
                  <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                    {app.workflowName}
                  </span>
                )}
              </div>
              {app.progress !== undefined && (
                <div className="space-y-1">
                  <Progress value={app.progress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {app.completedTaskCount ?? 0}/{app.taskCount ?? 0} tasks
                  </p>
                </div>
              )}
              {app.notes && (
                <CardDescription className="mt-2 line-clamp-2">{app.notes}</CardDescription>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
