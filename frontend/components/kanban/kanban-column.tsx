"use client"

import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KanbanCard } from "./kanban-card"
import type { Task, TaskStatus } from "@/types"
import { cn } from "@/lib/utils"

interface KanbanColumnProps {
  id: TaskStatus
  title: string
  tasks: Task[]
}

const columnColors: Record<TaskStatus, string> = {
  backlog: "border-t-slate-500",
  todo: "border-t-blue-500",
  in_progress: "border-t-yellow-500",
  done: "border-t-green-500",
}

export function KanbanColumn({ id, title, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <Card className={cn("flex h-full flex-col border-t-4", columnColors[id])}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {tasks.length}
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
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            Drop tasks here
          </div>
        )}
      </CardContent>
    </Card>
  )
}
