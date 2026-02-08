"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { stepRegistry } from "@/lib/workflow-builder/step-registry"
import type { WorkflowStep } from "@/types"

interface StepCardProps {
  step: WorkflowStep
  index: number
  isSelected: boolean
  onClick: () => void
  onDelete: () => void
}

export function StepCard({
  step,
  index,
  isSelected,
  onClick,
  onDelete,
}: StepCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const meta = stepRegistry[step.type]
  const Icon = meta.icon

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors",
        isSelected && "border-primary bg-primary/5",
        !isSelected && "hover:bg-muted/50",
        isDragging && "opacity-50"
      )}
      onClick={onClick}
    >
      <button
        className="cursor-grab text-muted-foreground hover:text-foreground shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <Icon className="size-4 shrink-0 text-muted-foreground" />

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{step.label}</div>
      </div>

      <Badge variant="outline" className="text-xs shrink-0">
        {index + 1}
      </Badge>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}
