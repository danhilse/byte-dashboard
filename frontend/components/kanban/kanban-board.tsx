"use client"

import { useState, useMemo, useCallback } from "react"
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
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"

import { KanbanColumn } from "./kanban-column"
import { KanbanCard } from "./kanban-card"
import type { Task, TaskStatus } from "@/types"

interface KanbanBoardProps {
  initialTasks: Task[]
}

const columns: { id: TaskStatus; title: string }[] = [
  { id: "backlog", title: "Backlog" },
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "done", title: "Done" },
]

export function KanbanBoard({ initialTasks }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

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

  // Memoize tasks grouped by status - computed once per tasks change instead of 4x per render
  const tasksByStatus = useMemo(() => {
    return columns.reduce(
      (acc, col) => {
        acc[col.id] = tasks.filter((task) => task.status === col.id)
        return acc
      },
      {} as Record<TaskStatus, Task[]>
    )
  }, [tasks])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    setTasks((currentTasks) => {
      const task = currentTasks.find((t) => t.id === active.id)
      if (task) {
        setActiveTask(task)
      }
      return currentTasks
    })
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Check if we're over a column
    const isOverColumn = columns.some((col) => col.id === overId)

    setTasks((prev) => {
      const activeTask = prev.find((t) => t.id === activeId)
      if (!activeTask) return prev

      if (isOverColumn) {
        const newStatus = overId as TaskStatus
        if (activeTask.status !== newStatus) {
          return prev.map((t) =>
            t.id === activeId ? { ...t, status: newStatus } : t
          )
        }
        return prev
      }

      // Check if we're over another task
      const overTask = prev.find((t) => t.id === overId)
      if (overTask && activeTask.status !== overTask.status) {
        return prev.map((t) =>
          t.id === activeId ? { ...t, status: overTask.status } : t
        )
      }
      return prev
    })
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    setTasks((prev) => {
      const activeTask = prev.find((t) => t.id === activeId)
      const overTask = prev.find((t) => t.id === overId)

      if (!activeTask) return prev

      // If dropping on a task in the same column, reorder
      if (overTask && activeTask.status === overTask.status) {
        const columnTasks = prev.filter((t) => t.status === activeTask.status)
        const oldIndex = columnTasks.findIndex((t) => t.id === activeId)
        const newIndex = columnTasks.findIndex((t) => t.id === overId)

        if (oldIndex !== newIndex) {
          const newColumnTasks = arrayMove(columnTasks, oldIndex, newIndex)
          const otherTasks = prev.filter((t) => t.status !== activeTask.status)
          return [...otherTasks, ...newColumnTasks]
        }
      }
      return prev
    })
  }, [])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid h-[calc(100vh-12rem)] auto-cols-fr grid-flow-col gap-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            tasks={tasksByStatus[column.id]}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && <KanbanCard task={activeTask} />}
      </DragOverlay>
    </DndContext>
  )
}
