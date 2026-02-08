"use client"

import { useState, useCallback, useMemo } from "react"
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
import { Plus, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { StepCard } from "./step-card"
import { PhaseHeader } from "./phase-header"
import {
  stepTypeList,
  createDefaultStep,
} from "@/lib/workflow-builder/step-registry"
import type { WorkflowStep, WorkflowPhase, StepType } from "@/types"

const PHASE_PREFIX = "phase::"

interface StepListProps {
  steps: WorkflowStep[]
  phases: WorkflowPhase[]
  selectedStepId: string | null
  onSelectStep: (id: string) => void
  onStepsChange: (steps: WorkflowStep[]) => void
  onPhasesChange: (phases: WorkflowPhase[]) => void
  onDeleteStep: (id: string) => void
}

/**
 * Build an interleaved ID array mixing phase headers and step IDs.
 * Unassigned steps come first, then each phase header followed by its steps.
 */
function buildInterleavedIds(
  steps: WorkflowStep[],
  phases: WorkflowPhase[]
): string[] {
  const ids: string[] = []

  // Unassigned steps (no phaseId or phaseId doesn't match any existing phase)
  const phaseIdSet = new Set(phases.map((p) => p.id))
  for (const step of steps) {
    if (!step.phaseId || !phaseIdSet.has(step.phaseId)) {
      ids.push(step.id)
    }
  }

  // Each phase header + its steps
  for (const phase of phases) {
    ids.push(`${PHASE_PREFIX}${phase.id}`)
    for (const step of steps) {
      if (step.phaseId === phase.id) {
        ids.push(step.id)
      }
    }
  }

  return ids
}

/**
 * Given a reordered interleaved ID array, rebuild the steps array (in new order)
 * and the phases array (in new order), assigning phaseId to each step based on
 * which phase header it follows in the array.
 */
function parseInterleavedOrder(
  interleavedIds: string[],
  stepsMap: Map<string, WorkflowStep>,
  validPhaseIds: Set<string>
): WorkflowStep[] {
  const newSteps: WorkflowStep[] = []
  let currentPhaseId: string | undefined = undefined

  for (const id of interleavedIds) {
    if (id.startsWith(PHASE_PREFIX)) {
      const phaseId = id.slice(PHASE_PREFIX.length)
      if (validPhaseIds.has(phaseId)) {
        currentPhaseId = phaseId
      }
    } else {
      const step = stepsMap.get(id)
      if (step) {
        newSteps.push({ ...step, phaseId: currentPhaseId })
      }
    }
  }

  return newSteps
}

export function StepList({
  steps,
  phases,
  selectedStepId,
  onSelectStep,
  onStepsChange,
  onPhasesChange,
  onDeleteStep,
}: StepListProps) {
  const [addStepPopoverOpen, setAddStepPopoverOpen] = useState(false)
  const [addPhaseOpen, setAddPhaseOpen] = useState(false)
  const [newPhaseLabel, setNewPhaseLabel] = useState("")
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const interleavedIds = useMemo(
    () => buildInterleavedIds(steps, phases),
    [steps, phases]
  )
  const phaseIdSet = useMemo(() => new Set(phases.map((p) => p.id)), [phases])
  const stepsMap = useMemo(() => new Map(steps.map((s) => [s.id, s])), [steps])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const activeId = String(active.id)
      const overId = String(over.id)

      // Reordering a phase header should only reorder phase order, not remap step phase assignments.
      if (activeId.startsWith(PHASE_PREFIX)) {
        const activePhaseId = activeId.slice(PHASE_PREFIX.length)
        const activePhaseIndex = phases.findIndex((p) => p.id === activePhaseId)
        if (activePhaseIndex === -1) return

        let targetPhaseIndex = 0
        if (overId.startsWith(PHASE_PREFIX)) {
          const overPhaseId = overId.slice(PHASE_PREFIX.length)
          const found = phases.findIndex((p) => p.id === overPhaseId)
          if (found === -1) return
          targetPhaseIndex = found
        } else {
          const overStep = stepsMap.get(overId)
          if (overStep?.phaseId && phaseIdSet.has(overStep.phaseId)) {
            const found = phases.findIndex((p) => p.id === overStep.phaseId)
            if (found === -1) return
            targetPhaseIndex = found
          } else {
            targetPhaseIndex = 0
          }
        }

        if (activePhaseIndex === targetPhaseIndex) return
        onPhasesChange(arrayMove(phases, activePhaseIndex, targetPhaseIndex))
        return
      }

      const oldIndex = interleavedIds.indexOf(activeId)
      const newIndex = interleavedIds.indexOf(overId)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(interleavedIds, oldIndex, newIndex)
      const newSteps = parseInterleavedOrder(
        reordered,
        stepsMap,
        phaseIdSet
      )

      onStepsChange(newSteps)
    },
    [
      interleavedIds,
      phaseIdSet,
      phases,
      stepsMap,
      onPhasesChange,
      onStepsChange,
    ]
  )

  const handleAddStep = (type: StepType) => {
    const newStep = createDefaultStep(type)
    onStepsChange([...steps, newStep])
    onSelectStep(newStep.id)
    setAddStepPopoverOpen(false)
  }

  const handleAddPhase = () => {
    const trimmed = newPhaseLabel.trim()
    if (!trimmed) return
    const newPhase: WorkflowPhase = {
      id: crypto.randomUUID(),
      label: trimmed,
    }
    onPhasesChange([...phases, newPhase])
    setNewPhaseLabel("")
    setAddPhaseOpen(false)
  }

  const handleDeletePhase = (phaseId: string) => {
    // Remove phase, unassign its steps
    onPhasesChange(phases.filter((p) => p.id !== phaseId))
    onStepsChange(
      steps.map((s) =>
        s.phaseId === phaseId ? { ...s, phaseId: undefined } : s
      )
    )
    // Clean up collapsed state
    setCollapsedPhases((prev) => {
      const next = { ...prev }
      delete next[phaseId]
      return next
    })
  }

  const handlePhaseCollapse = (phaseId: string) => {
    setCollapsedPhases((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }))
  }

  const handlePhaseLabelChange = (phaseId: string, label: string) => {
    onPhasesChange(
      phases.map((p) => (p.id === phaseId ? { ...p, label } : p))
    )
  }

  // Group steps by phase for counting
  const phaseStepCounts = new Map<string, number>()
  for (const step of steps) {
    if (!step.phaseId || !phaseIdSet.has(step.phaseId)) {
      continue
    } else {
      phaseStepCounts.set(
        step.phaseId,
        (phaseStepCounts.get(step.phaseId) ?? 0) + 1
      )
    }
  }

  // Track step index globally for numbering
  let globalIndex = 0

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Steps ({steps.length})
        </span>
        {phases.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {phases.length} {phases.length === 1 ? "phase" : "phases"}
          </span>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={interleavedIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-1.5">
            {/* Unassigned steps */}
            {(() => {
              const unassignedSteps = steps.filter(
                (s) => !s.phaseId || !phaseIdSet.has(s.phaseId)
              )
              return unassignedSteps.map((step) => {
                const idx = globalIndex++
                return (
                  <StepCard
                    key={step.id}
                    step={step}
                    index={idx}
                    isSelected={step.id === selectedStepId}
                    onClick={() => onSelectStep(step.id)}
                    onDelete={() => onDeleteStep(step.id)}
                  />
                )
              })
            })()}

            {/* Phases with their steps */}
            {phases.map((phase) => {
              const phaseSteps = steps.filter((s) => s.phaseId === phase.id)
              const isCollapsed = collapsedPhases[phase.id] ?? false

              return (
                <div key={phase.id} className="flex flex-col gap-1.5">
                  <PhaseHeader
                    phase={phase}
                    stepCount={phaseStepCounts.get(phase.id) ?? 0}
                    isCollapsed={isCollapsed}
                    onToggleCollapse={() => handlePhaseCollapse(phase.id)}
                    onLabelChange={(label) =>
                      handlePhaseLabelChange(phase.id, label)
                    }
                    onDelete={() => handleDeletePhase(phase.id)}
                  />
                  {!isCollapsed &&
                    phaseSteps.map((step) => {
                      const idx = globalIndex++
                      return (
                        <StepCard
                          key={step.id}
                          step={step}
                          index={idx}
                          isSelected={step.id === selectedStepId}
                          onClick={() => onSelectStep(step.id)}
                          onDelete={() => onDeleteStep(step.id)}
                        />
                      )
                    })}
                </div>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2 mt-2">
        <Popover open={addStepPopoverOpen} onOpenChange={setAddStepPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1">
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

        <Popover open={addPhaseOpen} onOpenChange={setAddPhaseOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Layers className="mr-2 size-4" />
              Add Phase
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="start">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Phase Name</label>
              <Input
                value={newPhaseLabel}
                onChange={(e) => setNewPhaseLabel(e.target.value)}
                placeholder="e.g. Application Review"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddPhase()
                }}
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleAddPhase}
                disabled={!newPhaseLabel.trim()}
              >
                Add Phase
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
