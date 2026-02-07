"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { StepCard } from "./step-card"
import {
  stepTypeList,
  createDefaultStep,
} from "@/lib/workflow-builder/step-registry"
import type { WorkflowStep, StepType } from "@/types"

interface StepListProps {
  steps: WorkflowStep[]
  selectedStepId: string | null
  onSelectStep: (id: string) => void
  onStepsChange: (steps: WorkflowStep[]) => void
  onDeleteStep: (id: string) => void
}

export function StepList({
  steps,
  selectedStepId,
  onSelectStep,
  onStepsChange,
  onDeleteStep,
}: StepListProps) {
  const [addPopoverOpen, setAddPopoverOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = steps.findIndex((s) => s.id === active.id)
    const newIndex = steps.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    onStepsChange(arrayMove(steps, oldIndex, newIndex))
  }

  const handleAddStep = (type: StepType) => {
    const newStep = createDefaultStep(type)
    onStepsChange([...steps, newStep])
    onSelectStep(newStep.id)
    setAddPopoverOpen(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-2 text-sm font-medium text-muted-foreground">
        Steps ({steps.length})
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={steps.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-1.5">
            {steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index}
                isSelected={step.id === selectedStepId}
                onClick={() => onSelectStep(step.id)}
                onDelete={() => onDeleteStep(step.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="mt-2 w-full">
            <Plus className="mr-2 size-4" />
            Add Step
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="grid gap-1">
            {stepTypeList.map((meta) => {
              const Icon = meta.icon
              return (
                <button
                  key={meta.type}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent text-left w-full"
                  onClick={() => handleAddStep(meta.type)}
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {meta.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
