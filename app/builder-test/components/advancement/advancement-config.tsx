"use client"

import type {
  AdvancementCondition,
  WorkflowAction,
  WorkflowStepV2,
} from "../../types/workflow-v2"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Layers } from "lucide-react"
import { isCompoundCondition } from "../../types/workflow-v2"
import { SimpleConditionConfig } from "./simple-condition-config"
import { CompoundConditionBuilder } from "./compound-condition-builder"

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
  const handleConvertToCompound = () => {
    onChange({
      type: "compound",
      operator: "AND",
      conditions: [condition],
    })
  }

  const handleConvertToSimple = () => {
    if (isCompoundCondition(condition) && condition.conditions.length === 1) {
      onChange(condition.conditions[0])
    }
  }

  return (
    <div className="space-y-4">
      {/* Toggle between simple and compound */}
      {!isCompoundCondition(condition) && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
          <div>
            <div className="text-sm font-medium">Simple Condition</div>
            <div className="text-xs text-muted-foreground">
              Single condition for advancement
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleConvertToCompound}
          >
            <Layers className="mr-2 size-4" />
            Add AND/OR Logic
          </Button>
        </div>
      )}

      {isCompoundCondition(condition) && condition.conditions.length === 1 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
          <div>
            <div className="text-sm font-medium">Compound Condition</div>
            <div className="text-xs text-muted-foreground">
              Multiple conditions with AND/OR
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleConvertToSimple}
          >
            Convert to Simple
          </Button>
        </div>
      )}

      {/* Render appropriate config */}
      {isCompoundCondition(condition) ? (
        <CompoundConditionBuilder
          condition={condition}
          availableActions={availableActions}
          allSteps={allSteps}
          onChange={onChange}
        />
      ) : (
        <div className="rounded-lg border p-4">
          <SimpleConditionConfig
            condition={condition}
            availableActions={availableActions}
            allSteps={allSteps}
            onChange={onChange}
          />
        </div>
      )}
    </div>
  )
}
