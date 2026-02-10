"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type {
  BranchStepV2,
  StandardStepV2,
  WorkflowVariable,
  WorkflowStatus,
} from "../types/workflow-v2"
import { getVariableLabel, resolveDisplayValue } from "@/lib/workflow-builder-v2/variable-utils"
import {
  cloneStandardStep,
  createEmptyStandardStep,
} from "@/lib/workflow-builder-v2/workflow-operations"
import { StepCardV2 } from "./step-card-v2"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  GitBranch,
  ChevronDown,
  ChevronRight,
  Trash2,
  Copy,
  Plus,
  GripVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ConfirmAction } from "./confirm-action"

interface BranchStepCardProps {
  step: BranchStepV2
  statuses: WorkflowStatus[]
  variables: WorkflowVariable[]
  stepNumber: number
  isSelected: boolean
  isExpanded: boolean
  isAnyDragging?: boolean
  onToggleExpanded: () => void
  onSelect: () => void
  onDelete: () => void
  onDuplicate: () => void
  onTrackStepAdd: (trackId: string, step: StandardStepV2) => void
  onTrackStepDelete: (trackId: string, stepId: string) => void
  onTrackStepSelect: (trackId: string, stepId: string) => void
  selectedTrackStep?: { trackId: string; stepId: string } | null
}

export function BranchStepCard({
  step,
  statuses,
  variables,
  stepNumber,
  isSelected,
  isExpanded,
  isAnyDragging = false,
  onToggleExpanded,
  onSelect,
  onDelete,
  onDuplicate,
  onTrackStepAdd,
  onTrackStepDelete,
  onTrackStepSelect,
  selectedTrackStep,
}: BranchStepCardProps) {
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

  const [trackA, trackB] = step.tracks

  // Get condition summary text with clean display names
  const getConditionSummary = () => {
    const varLabel = step.condition.variableRef
      ? getVariableLabel(step.condition.variableRef, variables)
      : "variable"
    const opLabel =
      step.condition.operator === "equals" ? "=" :
      step.condition.operator === "not_equals" ? "≠" :
      step.condition.operator === "contains" ? "contains" :
      step.condition.operator === "not_contains" ? "doesn't contain" :
      step.condition.operator === "in" ? "is one of" :
      step.condition.operator === "not_in" ? "is not one of" :
      "="

    const rawValue = Array.isArray(step.condition.compareValue)
      ? step.condition.compareValue.join(", ")
      : step.condition.compareValue || ""
    const value = rawValue
      ? resolveDisplayValue(rawValue, variables, "value")
      : "value"

    return `${varLabel} ${opLabel} ${value}`
  }

  const handleTrackStepAdd = (trackId: string) => {
    const newStep = createEmptyStandardStep()
    onTrackStepAdd(trackId, newStep)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border-2 bg-card shadow-sm transition-all hover:shadow-md",
        "border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/10",
        isSelected && "ring-2 ring-primary",
        isDragging && "opacity-50"
      )}
    >
      {/* Step Number - hides on hover when drag handle appears, and hides during any drag */}
      <div
        className={cn(
          "absolute left-2 top-2 text-xs font-medium text-muted-foreground/40 transition-opacity",
          isAnyDragging && "opacity-0",
          !isAnyDragging && "group-hover:opacity-0"
        )}
      >
        {stepNumber}
      </div>

      {/* Drag Handle - shows on hover */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute left-2 top-3 cursor-grab text-muted-foreground opacity-0 transition-opacity active:cursor-grabbing",
          !isAnyDragging && "group-hover:opacity-100"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="size-4" />
      </div>

      {/* Header */}
      <div className="flex items-center p-3 pl-8">

        {/* Main Header Content */}
        <div
          className="flex flex-1 cursor-pointer items-center justify-between"
          onClick={onSelect}
        >
          <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-purple-500 text-white">
              <GitBranch className="mr-1 size-3" />
              BRANCH
            </Badge>
            <span className="font-medium">{step.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              className="h-5 gap-1 px-1 hover:bg-purple-100 dark:hover:bg-purple-900"
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpanded()
              }}
            >
              {isExpanded ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
            </Button>
            <span>When {getConditionSummary()}</span>
          </div>
        </div>

          {/* Action Buttons */}
          <div
            className={cn(
              "flex gap-1 opacity-0 transition-opacity",
              !isAnyDragging && "group-hover:opacity-100"
            )}
          >
            <Button
              variant="ghost"
              size="sm"
              className="size-7 p-0"
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate()
              }}
              title="Duplicate branch"
            >
              <Copy className="size-3.5" />
            </Button>
            <ConfirmAction
              variant="critical"
              title={`Delete branch "${step.name}"?`}
              description="This removes the entire branch and both tracks of nested steps."
              confirmLabel="Delete Branch"
              onConfirm={onDelete}
            >
              <Button
                variant="ghost"
                size="sm"
                className="size-7 p-0"
                onClick={(e) => e.stopPropagation()}
                title="Delete branch"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </ConfirmAction>
          </div>
        </div>
      </div>

      {/* Collapsed Summary */}
      {!isExpanded && (
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium">{trackA.label}</span> ({trackA.steps.length}{" "}
          {trackA.steps.length === 1 ? "step" : "steps"}) |{" "}
          <span className="font-medium">{trackB.label}</span> ({trackB.steps.length}{" "}
          {trackB.steps.length === 1 ? "step" : "steps"})
        </div>
      )}

      {/* Expanded Tracks - Side by Side */}
      {isExpanded && (
        <div className="border-t">
          <div className="grid grid-cols-2 gap-4 p-4">
            {/* Track A */}
            <div className="space-y-2">
              <div className="mb-3 flex items-center gap-2 border-l-2 border-blue-500 pl-3">
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  Track A: {trackA.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({trackA.steps.length})
                </span>
              </div>
              <div className="space-y-2 pl-3">
                {trackA.steps.length === 0 ? (
                  <div className="rounded border-2 border-dashed border-muted-foreground/20 p-4 text-center text-xs text-muted-foreground">
                    No steps yet
                  </div>
                ) : (
                  trackA.steps.map((trackStep, idx) => (
                    <StepCardV2
                      key={trackStep.id}
                      step={trackStep}
                      statuses={statuses}
                      stepNumber={idx + 1}
                      isSelected={
                        selectedTrackStep?.trackId === trackA.id &&
                        selectedTrackStep?.stepId === trackStep.id
                      }
                      onSelect={() => onTrackStepSelect(trackA.id, trackStep.id)}
                      onDelete={() => onTrackStepDelete(trackA.id, trackStep.id)}
                      onDuplicate={() => {
                        onTrackStepAdd(trackA.id, cloneStandardStep(trackStep))
                      }}
                    />
                  ))
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => handleTrackStepAdd(trackA.id)}
                >
                  <Plus className="mr-1 size-3" />
                  Add Step to {trackA.label}
                </Button>
              </div>
            </div>

            {/* Track B */}
            <div className="space-y-2">
              <div className="mb-3 flex items-center gap-2 border-l-2 border-orange-500 pl-3">
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  Track B: {trackB.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({trackB.steps.length})
                </span>
              </div>
              <div className="space-y-2 pl-3">
                {trackB.steps.length === 0 ? (
                  <div className="rounded border-2 border-dashed border-muted-foreground/20 p-4 text-center text-xs text-muted-foreground">
                    No steps yet
                  </div>
                ) : (
                  trackB.steps.map((trackStep, idx) => (
                    <StepCardV2
                      key={trackStep.id}
                      step={trackStep}
                      statuses={statuses}
                      stepNumber={idx + 1}
                      isSelected={
                        selectedTrackStep?.trackId === trackB.id &&
                        selectedTrackStep?.stepId === trackStep.id
                      }
                      onSelect={() => onTrackStepSelect(trackB.id, trackStep.id)}
                      onDelete={() => onTrackStepDelete(trackB.id, trackStep.id)}
                      onDuplicate={() => {
                        onTrackStepAdd(trackB.id, cloneStandardStep(trackStep))
                      }}
                    />
                  ))
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => handleTrackStepAdd(trackB.id)}
                >
                  <Plus className="mr-1 size-3" />
                  Add Step to {trackB.label}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
