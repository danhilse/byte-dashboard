"use client"

import { memo } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Calendar, User } from "lucide-react"
import { format } from "date-fns"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { priorityColors } from "@/lib/design-tokens"
import { cn } from "@/lib/utils"
import type { Task } from "@/types"

interface KanbanCardProps {
  task: Task
  className?: string
}

export const KanbanCard = memo(function KanbanCard({ task, className }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn("cursor-grab active:cursor-grabbing", className)}
    >
      <CardHeader className="p-3 pb-0">
        <div className="flex items-start gap-2">
          <button
            className="mt-1 cursor-grab touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-tight">{task.title}</p>
              <div className={`size-2 rounded-full ${priorityColors.background[task.priority]}`} />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        {task.description && (
          <p className="mb-2 text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          {task.tags.length > 2 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              +{task.tags.length - 2}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {task.assignee && (
            <div className="flex items-center gap-1">
              <User className="size-3" />
              <span className="truncate max-w-[80px]">{task.assignee.split(" ")[0]}</span>
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="size-3" />
              <span>{format(new Date(task.dueDate), "MMM d")}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
