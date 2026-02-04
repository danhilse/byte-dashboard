"use client"

import { useState, useMemo, useCallback, memo } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ApplicationKanbanCard } from "./application-kanban-card"
import { cn } from "@/lib/utils"
import type { Application, ApplicationStatus } from "@/types"

interface ApplicationsKanbanBoardProps {
  applications: Application[]
  onStatusChange?: (appId: string, newStatus: ApplicationStatus) => void
  onApplicationClick?: (app: Application) => void
}

const columns: { id: ApplicationStatus; title: string; color: string }[] = [
  { id: "draft", title: "Draft", color: "border-t-slate-500" },
  { id: "in_review", title: "In Review", color: "border-t-blue-500" },
  { id: "pending", title: "Pending", color: "border-t-yellow-500" },
  { id: "on_hold", title: "On Hold", color: "border-t-orange-500" },
  { id: "approved", title: "Approved", color: "border-t-green-500" },
  { id: "rejected", title: "Rejected", color: "border-t-red-500" },
]

export function ApplicationsKanbanBoard({
  applications: initialApplications,
  onStatusChange,
  onApplicationClick,
}: ApplicationsKanbanBoardProps) {
  const [applications, setApplications] = useState<Application[]>(initialApplications)
  const [activeApp, setActiveApp] = useState<Application | null>(null)

  // Sync with parent when initialApplications changes
  useMemo(() => {
    setApplications(initialApplications)
  }, [initialApplications])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const appsByStatus = useMemo(() => {
    return columns.reduce(
      (acc, col) => {
        acc[col.id] = applications.filter((app) => app.status === col.id)
        return acc
      },
      {} as Record<ApplicationStatus, Application[]>
    )
  }, [applications])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    setApplications((currentApps) => {
      const app = currentApps.find((a) => a.id === active.id)
      if (app) {
        setActiveApp(app)
      }
      return currentApps
    })
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const isOverColumn = columns.some((col) => col.id === overId)

    setApplications((prev) => {
      const activeApp = prev.find((a) => a.id === activeId)
      if (!activeApp) return prev

      if (isOverColumn) {
        const newStatus = overId as ApplicationStatus
        if (activeApp.status !== newStatus) {
          return prev.map((a) =>
            a.id === activeId ? { ...a, status: newStatus } : a
          )
        }
        return prev
      }

      const overApp = prev.find((a) => a.id === overId)
      if (overApp && activeApp.status !== overApp.status) {
        return prev.map((a) =>
          a.id === activeId ? { ...a, status: overApp.status } : a
        )
      }
      return prev
    })
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active } = event
      setActiveApp(null)

      const activeId = active.id as string
      const movedApp = applications.find((a) => a.id === activeId)
      const originalApp = initialApplications.find((a) => a.id === activeId)

      if (movedApp && originalApp && movedApp.status !== originalApp.status) {
        onStatusChange?.(activeId, movedApp.status)
      }
    },
    [applications, initialApplications, onStatusChange]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid h-[calc(100vh-14rem)] grid-cols-6 gap-4">
        {columns.map((column) => (
          <ApplicationKanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            applications={appsByStatus[column.id]}
            onApplicationClick={onApplicationClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeApp && <ApplicationKanbanCard application={activeApp} />}
      </DragOverlay>
    </DndContext>
  )
}

interface ApplicationKanbanColumnProps {
  id: ApplicationStatus
  title: string
  color: string
  applications: Application[]
  onApplicationClick?: (app: Application) => void
}

const ApplicationKanbanColumn = memo(function ApplicationKanbanColumn({
  id,
  title,
  color,
  applications,
  onApplicationClick,
}: ApplicationKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <Card className={cn("flex h-full flex-col border-t-4", color)}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {applications.length}
          </span>
        </div>
      </CardHeader>
      <CardContent
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 overflow-auto p-2 pt-0 transition-colors",
          isOver && "bg-muted/50"
        )}
      >
        <SortableContext
          items={applications.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {applications.map((app) => (
            <ApplicationKanbanCard
              key={app.id}
              application={app}
              onClick={() => onApplicationClick?.(app)}
              className="kanban-card-optimized"
            />
          ))}
        </SortableContext>
        {applications.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            Drop applications here
          </div>
        )}
      </CardContent>
    </Card>
  )
})
