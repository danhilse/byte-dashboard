"use client"

import { memo } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Workflow as WorkflowIcon } from "lucide-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { workflowStatusConfig } from "@/lib/status-config"
import { cn } from "@/lib/utils"
import type { Workflow } from "@/types"

interface WorkflowKanbanCardProps {
  workflow: Workflow
  onClick?: () => void
  className?: string
  isDraggable?: boolean
}

export const WorkflowKanbanCard = memo(function WorkflowKanbanCard({
  workflow,
  onClick,
  className,
  isDraggable = true,
}: WorkflowKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workflow.id, disabled: !isDraggable })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const initials = (workflow.contactName ?? "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  const statusConfig = workflowStatusConfig[workflow.status]

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(isDraggable && "cursor-grab active:cursor-grabbing", className)}
      onClick={onClick}
    >
      <CardHeader className="p-3 pb-0">
        <div className="flex items-start gap-2">
          <button
            className="mt-1 cursor-grab touch-none"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            disabled={!isDraggable}
            aria-label={isDraggable ? "Drag workflow card" : "Workflow card cannot be dragged"}
          >
            <GripVertical className="size-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <Avatar className="size-8 shrink-0">
                <AvatarImage src={workflow.contactAvatarUrl} alt={workflow.contactName} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight truncate">
                  {workflow.contactName ?? "Unknown"}
                </p>
                {workflow.definitionName && (
                  <p className="text-xs text-muted-foreground truncate">{workflow.definitionName}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        <div className="flex items-center justify-between">
          <Badge variant={statusConfig.variant} className="text-[10px]">
            {statusConfig.label}
          </Badge>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <WorkflowIcon className="size-3" />
            <span>{workflow.source === "manual" ? "Manual" : workflow.source === "formstack" ? "Formstack" : "API"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
