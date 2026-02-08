"use client"

import { useState } from "react"
import type { WorkflowPhase } from "../types/workflow-v2"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, GripVertical } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface PhaseManagementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  phases: WorkflowPhase[]
  onChange: (phases: WorkflowPhase[]) => void
}

export function PhaseManagementModal({
  open,
  onOpenChange,
  phases,
  onChange,
}: PhaseManagementModalProps) {
  const [localPhases, setLocalPhases] = useState<WorkflowPhase[]>(phases)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setLocalPhases((phases) => {
        const oldIndex = phases.findIndex((p) => p.id === active.id)
        const newIndex = phases.findIndex((p) => p.id === over.id)
        const reordered = arrayMove(phases, oldIndex, newIndex)
        // Update order field
        return reordered.map((phase, index) => ({ ...phase, order: index }))
      })
    }
  }

  const handleAddPhase = () => {
    const newPhase: WorkflowPhase = {
      id: `phase-${Date.now()}`,
      name: `Phase ${localPhases.length + 1}`,
      color: "#3b82f6",
      order: localPhases.length,
    }
    setLocalPhases([...localPhases, newPhase])
  }

  const handleRemovePhase = (id: string) => {
    const updated = localPhases.filter((p) => p.id !== id)
    // Reorder remaining phases
    setLocalPhases(updated.map((phase, index) => ({ ...phase, order: index })))
  }

  const handleUpdatePhase = (id: string, updates: Partial<WorkflowPhase>) => {
    setLocalPhases(
      localPhases.map((phase) => (phase.id === id ? { ...phase, ...updates } : phase))
    )
  }

  const handleSave = () => {
    onChange(localPhases)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setLocalPhases(phases) // Reset to original
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Phases</DialogTitle>
          <DialogDescription>
            Organize your workflow into phases for better visual organization. Drag to reorder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {localPhases.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No phases yet. Add a phase to organize your workflow.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localPhases.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {localPhases.map((phase) => (
                    <PhaseItem
                      key={phase.id}
                      phase={phase}
                      onUpdate={handleUpdatePhase}
                      onRemove={handleRemovePhase}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <Button variant="outline" size="sm" onClick={handleAddPhase} className="w-full">
            <Plus className="mr-2 size-4" />
            Add Phase
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface PhaseItemProps {
  phase: WorkflowPhase
  onUpdate: (id: string, updates: Partial<WorkflowPhase>) => void
  onRemove: (id: string) => void
}

function PhaseItem({ phase, onUpdate, onRemove }: PhaseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border bg-card p-3 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </div>

      {/* Color Picker */}
      <div>
        <Label htmlFor={`color-${phase.id}`} className="sr-only">
          Color
        </Label>
        <input
          id={`color-${phase.id}`}
          type="color"
          value={phase.color || "#3b82f6"}
          onChange={(e) => onUpdate(phase.id, { color: e.target.value })}
          className="size-8 cursor-pointer rounded border"
        />
      </div>

      {/* Name Input */}
      <div className="flex-1">
        <Label htmlFor={`name-${phase.id}`} className="sr-only">
          Phase Name
        </Label>
        <Input
          id={`name-${phase.id}`}
          value={phase.name}
          onChange={(e) => onUpdate(phase.id, { name: e.target.value })}
          placeholder="Phase name"
        />
      </div>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="sm"
        className="size-9 p-0"
        onClick={() => {
          if (confirm(`Delete phase "${phase.name}"?`)) {
            onRemove(phase.id)
          }
        }}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}
