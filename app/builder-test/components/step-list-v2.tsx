"use client"

import { useState, useEffect, useRef } from "react"
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import type { WorkflowStepV2, WorkflowTrigger, StandardStepV2, BranchStepV2 } from "../types/workflow-v2"
import { isBranchStep } from "../types/workflow-v2"
import { StepCardV2 } from "./step-card-v2"
import { BranchStepCard } from "./branch-step-card"
import { TriggerCard } from "./trigger-card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, GitBranch } from "lucide-react"

interface StepListV2Props {
  trigger: WorkflowTrigger
  steps: WorkflowStepV2[]
  selectedStepId: string | null
  selectedTrigger: boolean
  onTriggerSelect: () => void
  onStepSelect: (stepId: string) => void
  onStepsReorder: (steps: WorkflowStepV2[]) => void
  onStepAdd: (step: WorkflowStepV2) => void
  onStepDelete: (stepId: string) => void
  onStepDuplicate: (stepId: string) => void
  onStepUpdate: (step: WorkflowStepV2) => void
  onTrackStepAdd: (branchId: string, trackId: string, step: StandardStepV2) => void
  onTrackStepDelete: (branchId: string, trackId: string, stepId: string) => void
  onTrackStepSelect: (branchId: string, trackId: string, stepId: string) => void
  selectedTrackStep?: { branchId: string; trackId: string; stepId: string } | null
}

export function StepListV2({
  trigger,
  steps,
  selectedStepId,
  selectedTrigger,
  onTriggerSelect,
  onStepSelect,
  onStepsReorder,
  onStepAdd,
  onStepDelete,
  onStepDuplicate,
  onStepUpdate,
  onTrackStepAdd,
  onTrackStepDelete,
  onTrackStepSelect,
  selectedTrackStep,
}: StepListV2Props) {
  const [mounted, setMounted] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set())
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Only enable drag-and-drop after client-side hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Scroll to bottom when the last step is selected (for newly added steps)
  useEffect(() => {
    if (selectedStepId && scrollContainerRef.current && steps.length > 0) {
      // Check if the selected step is the last one
      const lastStep = steps[steps.length - 1]
      if (selectedStepId === lastStep.id) {
        // Small delay to ensure the DOM has updated
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
              top: scrollContainerRef.current.scrollHeight,
              behavior: "smooth",
            })
          }
        }, 100)
      }
    }
  }, [selectedStepId, steps])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false)
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.id === active.id)
      const newIndex = steps.findIndex((s) => s.id === over.id)
      const reorderedSteps = arrayMove(steps, oldIndex, newIndex)
      onStepsReorder(reorderedSteps)
    }
  }

  const handleToggleExpanded = (branchId: string) => {
    setExpandedBranches((prev) => {
      const next = new Set(prev)
      if (next.has(branchId)) {
        next.delete(branchId)
      } else {
        next.add(branchId)
      }
      return next
    })
  }

  const handleAddStandardStep = () => {
    const newStep: StandardStepV2 = {
      id: `step-${Date.now()}`,
      name: "New Step",
      actions: [],
      advancementCondition: { type: "automatic" },
    }
    onStepAdd(newStep)
  }

  const handleAddBranch = () => {
    const newBranch: BranchStepV2 = {
      id: `branch-${Date.now()}`,
      name: "New Branch",
      stepType: "branch" as const,
      condition: {
        variableRef: "", // User will select a variable
        operator: "equals" as const,
        compareValue: "",
      },
      tracks: [
        {
          id: `track-a-${Date.now()}`,
          label: "Track A",
          steps: [],
        },
        {
          id: `track-b-${Date.now()}-1`,
          label: "Track B",
          steps: [],
        },
      ],
      actions: [],
      advancementCondition: { type: "automatic" },
      isExpanded: true,
    }
    onStepAdd(newBranch)

    // Auto-expand the new branch
    setExpandedBranches((prev) => new Set(prev).add(newBranch.id))

    // Auto-collapse after 5 seconds
    setTimeout(() => {
      setExpandedBranches((prev) => {
        const next = new Set(prev)
        next.delete(newBranch.id)
        return next
      })
    }, 5000)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Step List */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {/* Trigger Section */}
          <div className="space-y-2">
            <div className="px-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Workflow Trigger
              </span>
            </div>
            <TriggerCard
              trigger={trigger}
              isSelected={selectedTrigger}
              onSelect={onTriggerSelect}
            />
            {/* Separator */}
            <div className="flex items-center gap-2 py-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">Steps</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>

          {/* Steps */}
          {mounted ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {steps.map((step, index) => {
                    if (isBranchStep(step)) {
                      return (
                        <BranchStepCard
                          key={step.id}
                          step={step}
                          stepNumber={index + 1}
                          isSelected={step.id === selectedStepId}
                          isExpanded={expandedBranches.has(step.id)}
                          onToggleExpanded={() => handleToggleExpanded(step.id)}
                          onSelect={() => onStepSelect(step.id)}
                          onDelete={() => onStepDelete(step.id)}
                          onDuplicate={() => onStepDuplicate(step.id)}
                          onTrackStepAdd={(trackId, newStep) =>
                            onTrackStepAdd(step.id, trackId, newStep)
                          }
                          onTrackStepDelete={(trackId, stepId) =>
                            onTrackStepDelete(step.id, trackId, stepId)
                          }
                          onTrackStepSelect={(trackId, stepId) =>
                            onTrackStepSelect(step.id, trackId, stepId)
                          }
                          selectedTrackStep={
                            selectedTrackStep?.branchId === step.id
                              ? {
                                  trackId: selectedTrackStep.trackId,
                                  stepId: selectedTrackStep.stepId,
                                }
                              : null
                          }
                        />
                      )
                    } else {
                      return (
                        <StepCardV2
                          key={step.id}
                          step={step}
                          stepNumber={index + 1}
                          isSelected={step.id === selectedStepId}
                          isAnyDragging={isDragging}
                          onSelect={() => onStepSelect(step.id)}
                          onDelete={() => onStepDelete(step.id)}
                          onDuplicate={() => onStepDuplicate(step.id)}
                        />
                      )
                    }
                  })}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            // Render without drag-and-drop during SSR
            <div className="space-y-2">
              {steps.map((step, index) => {
                if (isBranchStep(step)) {
                  return (
                    <BranchStepCard
                      key={step.id}
                      step={step}
                      stepNumber={index + 1}
                      isSelected={step.id === selectedStepId}
                      isExpanded={expandedBranches.has(step.id)}
                      onToggleExpanded={() => handleToggleExpanded(step.id)}
                      onSelect={() => onStepSelect(step.id)}
                      onDelete={() => onStepDelete(step.id)}
                      onDuplicate={() => onStepDuplicate(step.id)}
                      onTrackStepAdd={(trackId, newStep) =>
                        onTrackStepAdd(step.id, trackId, newStep)
                      }
                      onTrackStepDelete={(trackId, stepId) =>
                        onTrackStepDelete(step.id, trackId, stepId)
                      }
                      onTrackStepSelect={(trackId, stepId) =>
                        onTrackStepSelect(step.id, trackId, stepId)
                      }
                      selectedTrackStep={
                        selectedTrackStep?.branchId === step.id
                          ? {
                              trackId: selectedTrackStep.trackId,
                              stepId: selectedTrackStep.stepId,
                            }
                          : null
                      }
                    />
                  )
                } else {
                  return (
                    <StepCardV2
                      key={step.id}
                      step={step}
                      stepNumber={index + 1}
                      isSelected={step.id === selectedStepId}
                      onSelect={() => onStepSelect(step.id)}
                      onDelete={() => onStepDelete(step.id)}
                      onDuplicate={() => onStepDuplicate(step.id)}
                    />
                  )
                }
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer - Add Step Button */}
      <div className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full">
              <Plus className="mr-2 size-4" />
              Add Step
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56">
            <DropdownMenuItem onClick={handleAddStandardStep}>
              <Plus className="mr-2 size-4" />
              Standard Step
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddBranch}>
              <GitBranch className="mr-2 size-4" />
              Branch (Split Path)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
