"use client"

import { useEffect, useRef } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { ActionType, StandardStepV2, WorkflowStatus } from "../types/workflow-v2"
import { getActionMetadata } from "@/lib/workflow-builder-v2/action-registry"
import { getConditionBadgeText } from "@/lib/workflow-builder-v2/condition-registry"
import { resolveWorkflowStatusDisplay } from "@/lib/status-config"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GripVertical, Trash2, Copy, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ConfirmAction } from "./confirm-action"

interface StepCardV2Props {
  step: StandardStepV2
  statuses: WorkflowStatus[]
  stepNumber: number
  isSelected: boolean
  isAnyDragging?: boolean
  onSelect: () => void
  onDelete: () => void
  onDuplicate: () => void
}

export function StepCardV2({
  step,
  statuses,
  stepNumber,
  isSelected,
  isAnyDragging = false,
  onSelect,
  onDelete,
  onDuplicate,
}: StepCardV2Props) {
  const cardRef = useRef<HTMLDivElement>(null)
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

  // Scroll into view when selected (for steps in the middle of the list)
  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      })
    }
  }, [isSelected])

  // Combine refs for both drag-and-drop and scrolling
  const combinedRef = (node: HTMLDivElement | null) => {
    cardRef.current = node
    setNodeRef(node)
  }

  const statusUpdates = step.actions.filter(
    (action): action is Extract<typeof step.actions[number], { type: "update_status" }> =>
      action.type === "update_status"
  )

  const statusUpdateCounts = new Map<string, number>()
  statusUpdates.forEach((action) => {
    const statusId = action.config.status || "__unset__"
    statusUpdateCounts.set(statusId, (statusUpdateCounts.get(statusId) || 0) + 1)
  })
  const statusUpdateEntries = Array.from(statusUpdateCounts.entries())

  // Group non-status actions by type for badge display
  const actionCounts = new Map<string, number>()
  step.actions
    .filter((action) => action.type !== "update_status")
    .forEach((action) => {
      actionCounts.set(action.type, (actionCounts.get(action.type) || 0) + 1)
    })

  const conditionBadgeText = getConditionBadgeText(step.advancementCondition)

  return (
    <div
      ref={combinedRef}
      style={style}
      className={cn(
        "group relative rounded-lg border bg-card shadow-sm transition-all hover:shadow-md",
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

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute left-2 top-3 cursor-grab text-muted-foreground opacity-0 transition-opacity active:cursor-grabbing",
          !isAnyDragging && "group-hover:opacity-100"
        )}
      >
        <GripVertical className="size-4" />
      </div>

      {/* Content */}
      <div className="ml-6 p-3" onClick={onSelect}>
        {/* Step Name */}
        <div className="mb-2 pr-6 font-medium">{step.name}</div>

        {/* Description */}
        {step.description && (
          <div className="mb-3 text-xs text-muted-foreground">
            {step.description}
          </div>
        )}

        {/* Actions Section */}
        {(statusUpdateEntries.length > 0 || actionCounts.size > 0) && (
          <div className="mb-2">
            <div className="mb-1 text-xs font-medium text-muted-foreground">Actions:</div>
            <div className="flex flex-wrap gap-1">
              {statusUpdateEntries.map(([statusId, count]) => {
                const display = statusId === "__unset__"
                  ? { label: "(not set)", color: undefined as string | undefined }
                  : resolveWorkflowStatusDisplay(statusId, statuses)

                return (
                  <Badge
                    key={`status-${statusId}`}
                    variant="outline"
                    className="border bg-white text-xs text-foreground dark:bg-card"
                  >
                    {display.color && (
                      <span
                        className="mr-1.5 inline-block size-2 rounded-full"
                        style={{ backgroundColor: display.color }}
                      />
                    )}
                    {count > 1 ? `${count} ` : ""}
                    {display.label}
                  </Badge>
                )
              })}
              {Array.from(actionCounts.entries()).map(([type, count]) => {
                const metadata = getActionMetadata(type as ActionType)
                const Icon = metadata.icon
                return (
                  <Badge key={type} variant="secondary" className="text-xs">
                    <Icon className="mr-1 size-3" />
                    {count} {metadata.label.toLowerCase()}
                    {count > 1 ? "s" : ""}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* Advancement Section */}
        <div className="flex items-center gap-2 border-t pt-2">
          <ArrowRight className="size-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Then:</span>
          <Badge variant="outline" className="text-xs">
            {conditionBadgeText}
          </Badge>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        className={cn(
          "absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity",
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
          title="Duplicate step"
        >
          <Copy className="size-3.5" />
        </Button>
        <ConfirmAction
          variant="critical"
          title={`Delete step "${step.name}"?`}
          description="This removes the step and all actions configured inside it."
          confirmLabel="Delete Step"
          onConfirm={onDelete}
        >
          <Button
            variant="ghost"
            size="sm"
            className="size-7 p-0"
            onClick={(e) => e.stopPropagation()}
            title="Delete step"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </ConfirmAction>
      </div>
    </div>
  )
}
