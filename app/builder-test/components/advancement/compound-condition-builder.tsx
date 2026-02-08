"use client"

import type {
  AdvancementCondition,
  CompoundCondition,
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
import { Plus, Trash2, Layers } from "lucide-react"
import { conditionRegistry } from "@/lib/workflow-builder-v2/condition-registry"
import { SimpleConditionConfig } from "./simple-condition-config"
import { cn } from "@/lib/utils"

interface CompoundConditionBuilderProps {
  condition: CompoundCondition
  availableActions: WorkflowAction[]
  allSteps: WorkflowStepV2[]
  onChange: (condition: CompoundCondition) => void
  depth?: number // For nested rendering
}

export function CompoundConditionBuilder({
  condition,
  availableActions,
  allSteps,
  onChange,
  depth = 0,
}: CompoundConditionBuilderProps) {
  const handleOperatorChange = (operator: "AND" | "OR") => {
    onChange({
      ...condition,
      operator,
    })
  }

  const handleConditionChange = (index: number, newCondition: AdvancementCondition) => {
    const newConditions = [...condition.conditions]
    newConditions[index] = newCondition
    onChange({
      ...condition,
      conditions: newConditions,
    })
  }

  const handleRemoveCondition = (index: number) => {
    onChange({
      ...condition,
      conditions: condition.conditions.filter((_, i) => i !== index),
    })
  }

  const handleAddSimpleCondition = () => {
    onChange({
      ...condition,
      conditions: [
        ...condition.conditions,
        { type: "automatic" } as SimpleCondition,
      ],
    })
  }

  const handleAddCompoundCondition = () => {
    onChange({
      ...condition,
      conditions: [
        ...condition.conditions,
        {
          type: "compound",
          operator: "AND",
          conditions: [{ type: "automatic" }],
        } as CompoundCondition,
      ],
    })
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border p-4",
        depth > 0 && "bg-muted/30",
        depth > 1 && "bg-muted/50"
      )}
    >
      {/* Operator Selector */}
      <div className="flex items-center gap-2">
        <Layers className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Advance when</span>
        <Select value={condition.operator} onValueChange={handleOperatorChange}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">ALL</SelectItem>
            <SelectItem value="OR">ANY</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">of the following:</span>
      </div>

      {/* Conditions List */}
      <div className="space-y-2">
        {condition.conditions.length === 0 && (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            No conditions. Add a condition to get started.
          </div>
        )}

        {condition.conditions.map((cond, index) => (
          <div key={index} className="relative">
            {/* Condition Content */}
            {cond.type === "compound" ? (
              <CompoundConditionBuilder
                condition={cond}
                availableActions={availableActions}
                allSteps={allSteps}
                onChange={(updated) => handleConditionChange(index, updated)}
                depth={depth + 1}
              />
            ) : (
              <div className="rounded-lg border bg-card p-3">
                <SimpleConditionConfig
                  condition={cond}
                  availableActions={availableActions}
                  allSteps={allSteps}
                  onChange={(updated) => handleConditionChange(index, updated)}
                  compact
                />
              </div>
            )}

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 size-7 p-0"
              onClick={() => handleRemoveCondition(index)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddSimpleCondition}
          className="flex-1"
        >
          <Plus className="mr-2 size-4" />
          Add Condition
        </Button>
        {depth < 2 && ( // Limit nesting to 2 levels
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddCompoundCondition}
            className="flex-1"
          >
            <Layers className="mr-2 size-4" />
            Add Group
          </Button>
        )}
      </div>
    </div>
  )
}
