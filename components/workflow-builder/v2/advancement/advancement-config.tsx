"use client"

import type {
  AdvancementCondition,
  SimpleCondition,
  WorkflowAction,
  WorkflowStepV2,
} from "../../types/workflow-v2"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { isCompoundCondition } from "../../types/workflow-v2"
import { SimpleConditionConfig } from "./simple-condition-config"

interface AdvancementConfigProps {
  condition: AdvancementCondition
  availableActions: WorkflowAction[]
  allSteps: WorkflowStepV2[]
  onChange: (condition: AdvancementCondition) => void
}

export function AdvancementConfig({
  condition,
  availableActions,
  allSteps,
  onChange,
}: AdvancementConfigProps) {
  // Normalize to always work with an array of conditions
  const conditions: SimpleCondition[] = isCompoundCondition(condition)
    ? condition.conditions.filter((c) => c.type !== "compound") as SimpleCondition[]
    : [condition as SimpleCondition]

  const operator = isCompoundCondition(condition) ? condition.operator : "AND"
  const hasMultiple = conditions.length > 1

  const handleOperatorChange = (newOperator: "AND" | "OR") => {
    onChange({
      type: "compound",
      operator: newOperator,
      conditions,
    })
  }

  const handleConditionChange = (index: number, newCondition: SimpleCondition) => {
    const newConditions = [...conditions]
    newConditions[index] = newCondition

    if (newConditions.length === 1) {
      // Single condition - return as simple
      onChange(newConditions[0])
    } else {
      // Multiple conditions - return as compound
      onChange({
        type: "compound",
        operator,
        conditions: newConditions,
      })
    }
  }

  const handleRemoveCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index)

    if (newConditions.length === 1) {
      // Down to one condition - convert to simple
      onChange(newConditions[0])
    } else {
      // Still multiple - keep as compound
      onChange({
        type: "compound",
        operator,
        conditions: newConditions,
      })
    }
  }

  const handleAddCondition = () => {
    const newConditions = [...conditions, { type: "automatic" } as SimpleCondition]
    onChange({
      type: "compound",
      operator,
      conditions: newConditions,
    })
  }

  return (
    <div className="space-y-3">
      {/* AND/OR Selector - Only show when multiple conditions */}
      {hasMultiple && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-2">
          <span className="text-sm font-medium">Advance when</span>
          <Select value={operator} onValueChange={handleOperatorChange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">ALL</SelectItem>
              <SelectItem value="OR">ANY</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">of the following are true:</span>
        </div>
      )}

      {/* Conditions List */}
      <div className="space-y-2">
        {conditions.map((cond, index) => (
          <div key={index} className="relative rounded-lg border bg-card p-4">
            <SimpleConditionConfig
              condition={cond}
              availableActions={availableActions}
              allSteps={allSteps}
              onChange={(updated) => handleConditionChange(index, updated)}
            />

            {/* Remove Button - Only show if more than one condition */}
            {hasMultiple && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 size-7 p-0"
                onClick={() => handleRemoveCondition(index)}
                title="Remove condition"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Add Condition Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAddCondition}
        className="w-full"
      >
        <Plus className="mr-2 size-4" />
        Add Condition
      </Button>
    </div>
  )
}
