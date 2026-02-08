"use client"

import { useState, useRef, useEffect } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, ChevronRight, ChevronDown, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { WorkflowPhase } from "@/types"

interface PhaseHeaderProps {
  phase: WorkflowPhase
  stepCount: number
  isCollapsed: boolean
  onToggleCollapse: () => void
  onLabelChange: (label: string) => void
  onDelete: () => void
}

export function PhaseHeader({
  phase,
  stepCount,
  isCollapsed,
  onToggleCollapse,
  onLabelChange,
  onDelete,
}: PhaseHeaderProps) {
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [editLabel, setEditLabel] = useState(phase.label)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `phase::${phase.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  useEffect(() => {
    if (isEditingLabel && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditingLabel])

  const commitLabel = () => {
    const trimmed = editLabel.trim()
    if (trimmed && trimmed !== phase.label) {
      onLabelChange(trimmed)
    } else {
      setEditLabel(phase.label)
    }
    setIsEditingLabel(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-dashed bg-muted/50 px-3 py-2",
        isDragging && "opacity-50"
      )}
    >
      <button
        className="cursor-grab text-muted-foreground hover:text-foreground shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <button
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={onToggleCollapse}
      >
        {isCollapsed ? (
          <ChevronRight className="size-4" />
        ) : (
          <ChevronDown className="size-4" />
        )}
      </button>

      {isEditingLabel ? (
        <Input
          ref={inputRef}
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitLabel()
            if (e.key === "Escape") {
              setEditLabel(phase.label)
              setIsEditingLabel(false)
            }
          }}
          className="h-6 text-sm font-semibold px-1"
        />
      ) : (
        <span
          className="text-sm font-semibold cursor-pointer hover:underline flex-1 min-w-0 truncate"
          onDoubleClick={() => setIsEditingLabel(true)}
        >
          {phase.label}
        </span>
      )}

      <Badge variant="secondary" className="text-xs shrink-0">
        {stepCount} {stepCount === 1 ? "step" : "steps"}
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
