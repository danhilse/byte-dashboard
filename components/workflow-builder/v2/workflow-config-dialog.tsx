"use client"

import { useState } from "react"
import { Settings, Plus, Trash2, Edit2, GripVertical } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { createCustomVariableId } from "@/lib/workflow-builder-v2/id-utils"
import type { BuilderCommand } from "@/lib/workflow-builder-v2/builder-command-serializer"
import type { WorkflowDefinitionV2, WorkflowVariable, WorkflowStatus, VariableDataType } from "../types/workflow-v2"
import { WorkflowJsonExport } from "./workflow-json-export"
import { ConfirmAction } from "./confirm-action"

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

interface WorkflowConfigDialogProps {
  workflow: WorkflowDefinitionV2
  commands?: BuilderCommand[]
  onClearCommands?: () => void
  onChange: (workflow: WorkflowDefinitionV2) => void
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
        <ConfirmAction
          title={`Delete status "${status.label}"?`}
          description="This may break actions that reference this status."
          confirmLabel="Delete Status"
          onConfirm={onDelete}
        >
          <Button
            variant="ghost"
            size="sm"
            className="size-8 p-0"
          >
            <Trash2 className="size-4" />
          </Button>
        </ConfirmAction>
      </div>
    </div>
  )
}

export function WorkflowConfigDialog({
  workflow,
  commands,
  onClearCommands,
  onChange,
}: WorkflowConfigDialogProps) {
  const [open, setOpen] = useState(false)

  // General tab state
  const [name, setName] = useState(workflow.name)
  const [description, setDescription] = useState(workflow.description || "")

  // Variables tab state
  const [editingVariableId, setEditingVariableId] = useState<string | null>(null)
  const [variableFormData, setVariableFormData] = useState<{
    name: string
    dataType: VariableDataType
  }>({
    name: "",
    dataType: "text",
  })

  // Statuses tab state
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null)
  const [statusFormData, setStatusFormData] = useState({
    label: "",
    color: "#3b82f6",
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const customVariables = workflow.variables.filter((v) => v.source.type === "custom")
  const sortedStatuses = [...workflow.statuses].sort((a, b) => a.order - b.order)

  // General tab handlers
  const handleSaveGeneral = () => {
    onChange({
      ...workflow,
      name,
      description,
      updatedAt: new Date().toISOString(),
    })
  }

  // Variables tab handlers
  const handleAddVariable = () => {
    if (!variableFormData.name.trim()) return

    const newVariable: WorkflowVariable = {
      id: createCustomVariableId(),
      name: variableFormData.name.trim(),
      type: "custom",
      dataType: variableFormData.dataType,
      source: { type: "custom" },
      readOnly: false,
    }

    onChange({
      ...workflow,
      variables: [...workflow.variables, newVariable],
      updatedAt: new Date().toISOString(),
    })
    resetVariableForm()
  }

  const handleUpdateVariable = () => {
    if (!editingVariableId || !variableFormData.name.trim()) return

    const updatedVariables = workflow.variables.map((v) =>
      v.id === editingVariableId
        ? {
            ...v,
            name: variableFormData.name.trim(),
            dataType: variableFormData.dataType,
          }
        : v
    )

    onChange({
      ...workflow,
      variables: updatedVariables,
      updatedAt: new Date().toISOString(),
    })
    resetVariableForm()
  }

  const handleDeleteVariable = (id: string) => {
    onChange({
      ...workflow,
      variables: workflow.variables.filter((v) => v.id !== id),
      updatedAt: new Date().toISOString(),
    })
  }

  const handleEditVariable = (variable: WorkflowVariable) => {
    setEditingVariableId(variable.id)
    setVariableFormData({
      name: variable.name,
      dataType: variable.dataType || "text",
    })
  }

  const resetVariableForm = () => {
    setEditingVariableId(null)
    setVariableFormData({
      name: "",
      dataType: "text",
    })
  }

  // Statuses tab handlers
  const handleAddStatus = () => {
    if (!statusFormData.label.trim()) return

    const newStatus: WorkflowStatus = {
      id: statusFormData.label.toLowerCase().replace(/\s+/g, "_"),
      label: statusFormData.label.trim(),
      color: statusFormData.color,
      order: workflow.statuses.length,
    }

    onChange({
      ...workflow,
      statuses: [...workflow.statuses, newStatus],
      updatedAt: new Date().toISOString(),
    })
    resetStatusForm()
  }

  const handleUpdateStatus = () => {
    if (!editingStatusId || !statusFormData.label.trim()) return

    const updatedStatuses = workflow.statuses.map((s) =>
      s.id === editingStatusId
        ? {
            ...s,
            label: statusFormData.label.trim(),
            color: statusFormData.color,
          }
        : s
    )

    onChange({
      ...workflow,
      statuses: updatedStatuses,
      updatedAt: new Date().toISOString(),
    })
    resetStatusForm()
  }

  const handleDeleteStatus = (id: string) => {
    onChange({
      ...workflow,
      statuses: workflow.statuses.filter((s) => s.id !== id),
      updatedAt: new Date().toISOString(),
    })
  }

  const handleEditStatus = (status: WorkflowStatus) => {
    setEditingStatusId(status.id)
    setStatusFormData({
      label: status.label,
      color: status.color || "#3b82f6",
    })
  }

  const handleStatusDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sortedStatuses.findIndex((s) => s.id === active.id)
      const newIndex = sortedStatuses.findIndex((s) => s.id === over.id)
      const reordered = arrayMove(sortedStatuses, oldIndex, newIndex)
      onChange({
        ...workflow,
        statuses: reordered.map((s, i) => ({ ...s, order: i })),
        updatedAt: new Date().toISOString(),
      })
    }
  }

  const resetStatusForm = () => {
    setEditingStatusId(null)
    setStatusFormData({
      label: "",
      color: "#3b82f6",
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 size-4" />
          Configure Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl h-[700px] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Workflow Configuration</DialogTitle>
          <DialogDescription>
            Configure workflow settings, custom variables, and statuses
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="variables">
              Variables {customVariables.length > 0 && `(${customVariables.length})`}
            </TabsTrigger>
            <TabsTrigger value="statuses">
              Statuses {workflow.statuses.length > 0 && `(${workflow.statuses.length})`}
            </TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="flex-1 overflow-auto space-y-4 mt-4 data-[state=active]:flex data-[state=active]:flex-col">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workflow-name">Workflow Name</Label>
                <Input
                  id="workflow-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Applicant Onboarding"
                  onBlur={handleSaveGeneral}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workflow-description">Description (Optional)</Label>
                <Textarea
                  id="workflow-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this workflow do?"
                  rows={3}
                  onBlur={handleSaveGeneral}
                />
              </div>
            </div>
          </TabsContent>

          {/* Variables Tab */}
          <TabsContent value="variables" className="flex-1 overflow-auto space-y-4 mt-4 data-[state=active]:flex data-[state=active]:flex-col">
            {/* Add/Edit Form */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="variable-name">Variable Name</Label>
                    <Input
                      id="variable-name"
                      value={variableFormData.name}
                      onChange={(e) =>
                        setVariableFormData({ ...variableFormData, name: e.target.value })
                      }
                      placeholder="e.g., Status Override"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="variable-type">Type</Label>
                    <select
                      id="variable-type"
                      value={variableFormData.dataType}
                      onChange={(e) =>
                        setVariableFormData({
                          ...variableFormData,
                          dataType: e.target.value as VariableDataType,
                        })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="date">Date</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  {editingVariableId ? (
                    <>
                      <Button onClick={handleUpdateVariable} size="sm">
                        Update Variable
                      </Button>
                      <Button onClick={resetVariableForm} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleAddVariable}
                      size="sm"
                      disabled={!variableFormData.name.trim()}
                    >
                      <Plus className="mr-2 size-4" />
                      Add Variable
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Variables List */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Custom Variables</Label>
              {customVariables.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No custom variables yet. Add one above to get started.
                </div>
              ) : (
                <div className="space-y-1">
                  {customVariables.map((variable) => (
                    <div
                      key={variable.id}
                      className="flex items-center gap-2 rounded-lg border bg-card p-3"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{variable.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Type: {variable.dataType || "text"} • ID: {variable.id}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0"
                          onClick={() => handleEditVariable(variable)}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <ConfirmAction
                          title={`Delete variable "${variable.name}"?`}
                          description="This may break actions that reference this variable."
                          confirmLabel="Delete Variable"
                          onConfirm={() => handleDeleteVariable(variable.id)}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </ConfirmAction>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Statuses Tab */}
          <TabsContent value="statuses" className="flex-1 overflow-auto space-y-4 mt-4 data-[state=active]:flex data-[state=active]:flex-col">
            {/* Add/Edit Form */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status-label">Status Label</Label>
                  <Input
                    id="status-label"
                    value={statusFormData.label}
                    onChange={(e) =>
                      setStatusFormData({ ...statusFormData, label: e.target.value })
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
                          setStatusFormData({ ...statusFormData, color: colorOption.value })
                        }
                        className={cn(
                          "size-8 rounded-md border-2 transition-all hover:scale-110",
                          statusFormData.color === colorOption.value
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
                <div className="flex gap-2">
                  {editingStatusId ? (
                    <>
                      <Button onClick={handleUpdateStatus} size="sm">
                        Update Status
                      </Button>
                      <Button onClick={resetStatusForm} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleAddStatus}
                      size="sm"
                      disabled={!statusFormData.label.trim()}
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
              <Label className="text-sm font-medium">Workflow Statuses</Label>
              {sortedStatuses.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No statuses defined yet. Add one above to get started.
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleStatusDragEnd}
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
                          onEdit={() => handleEditStatus(status)}
                          onDelete={() => handleDeleteStatus(status.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent
            value="export"
            className="mt-4 flex-1 min-h-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
          >
            <WorkflowJsonExport
              workflow={workflow}
              commands={commands}
              onClearCommands={onClearCommands}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
