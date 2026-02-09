"use client"

import { useState } from "react"
import { Plus, Trash2, Edit2, GripVertical, Flag } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { WorkflowStatus } from "../types/workflow-v2"

// Predefined color palette for statuses
const STATUS_COLORS = [
  { label: "Slate", value: "#64748b" },
  { label: "Gray", value: "#6b7280" },
  { label: "Zinc", value: "#71717a" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Yellow", value: "#eab308" },
  { label: "Lime", value: "#84cc16" },
  { label: "Green", value: "#22c55e" },
  { label: "Emerald", value: "#10b981" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Purple", value: "#a855f7" },
  { label: "Fuchsia", value: "#d946ef" },
  { label: "Pink", value: "#ec4899" },
  { label: "Rose", value: "#f43f5e" },
]

interface StatusesDialogProps {
  statuses: WorkflowStatus[]
  onChange: (statuses: WorkflowStatus[]) => void
}

interface SortableStatusItemProps {
  status: WorkflowStatus
  onEdit: () => void
  onDelete: () => void
}

function SortableStatusItem({ status, onEdit, onDelete }: SortableStatusItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card p-3",
        isDragging && "opacity-50"
      )}
    >
      <button
        className="cursor-grab touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4 text-muted-foreground" />
      </button>
      <div
        className="size-4 rounded-full"
        style={{ backgroundColor: status.color }}
      />
      <div className="flex-1">
        <div className="font-medium">{status.label}</div>
        <div className="text-xs text-muted-foreground">
          ID: {status.id}
        </div>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={onEdit}
        >
          <Edit2 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export function StatusesDialog({ statuses, onChange }: StatusesDialogProps) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    label: "",
    color: "#3b82f6",
  })

  const sortedStatuses = [...statuses].sort((a, b) => a.order - b.order)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleAdd = () => {
    if (!formData.label.trim()) return

    const newStatus: WorkflowStatus = {
      id: formData.label.toLowerCase().replace(/\s+/g, "_"),
      label: formData.label.trim(),
      color: formData.color,
      order: statuses.length,
    }

    onChange([...statuses, newStatus])
    resetForm()
  }

  const handleUpdate = () => {
    if (!editingId || !formData.label.trim()) return

    const updatedStatuses = statuses.map((s) =>
      s.id === editingId
        ? {
            ...s,
            label: formData.label.trim(),
            color: formData.color,
          }
        : s
    )

    onChange(updatedStatuses)
    resetForm()
  }

  const handleDelete = (id: string) => {
    if (confirm("Delete this status? It may break actions that reference it.")) {
      onChange(statuses.filter((s) => s.id !== id))
    }
  }

  const handleEdit = (status: WorkflowStatus) => {
    setEditingId(status.id)
    setFormData({
      label: status.label,
      color: status.color || "#3b82f6",
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sortedStatuses.findIndex((s) => s.id === active.id)
      const newIndex = sortedStatuses.findIndex((s) => s.id === over.id)
      const reordered = arrayMove(sortedStatuses, oldIndex, newIndex)
      onChange(reordered.map((s, i) => ({ ...s, order: i })))
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setFormData({
      label: "",
      color: "#3b82f6",
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Flag className="mr-2 size-4" />
          Manage Statuses
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Workflow Statuses</DialogTitle>
          <DialogDescription>
            Define the statuses that workflow executions can have. These are used in
            "Update Status" actions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add/Edit Form */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="grid gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status-label">Status Label</Label>
                  <Input
                    id="status-label"
                    value={formData.label}
                    onChange={(e) =>
                      setFormData({ ...formData, label: e.target.value })
                    }
                    placeholder="e.g., In Review"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="grid grid-cols-10 gap-2">
                    {STATUS_COLORS.map((colorOption) => (
                      <button
                        key={colorOption.value}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, color: colorOption.value })
                        }
                        className={cn(
                          "size-8 rounded-md border-2 transition-all hover:scale-110",
                          formData.color === colorOption.value
                            ? "border-primary ring-2 ring-primary ring-offset-2"
                            : "border-transparent"
                        )}
                        style={{ backgroundColor: colorOption.value }}
                        title={colorOption.label}
                        aria-label={`Select ${colorOption.label}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {editingId ? (
                  <>
                    <Button onClick={handleUpdate} size="sm">
                      Update Status
                    </Button>
                    <Button onClick={resetForm} variant="outline" size="sm">
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleAdd}
                    size="sm"
                    disabled={!formData.label.trim()}
                  >
                    <Plus className="mr-2 size-4" />
                    Add Status
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Statuses List */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Current Statuses</Label>
            {sortedStatuses.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No statuses defined yet. Add one above to get started.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedStatuses.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {sortedStatuses.map((status) => (
                      <SortableStatusItem
                        key={status.id}
                        status={status}
                        onEdit={() => handleEdit(status)}
                        onDelete={() => handleDelete(status.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
