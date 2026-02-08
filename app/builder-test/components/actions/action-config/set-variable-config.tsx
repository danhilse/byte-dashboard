"use client"

import type { WorkflowAction, WorkflowVariable } from "../../../types/workflow-v2"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { VariableSelector } from "../../variable-selector"

interface SetVariableConfigProps {
  action: Extract<WorkflowAction, { type: "set_variable" }>
  variables: WorkflowVariable[]
  onChange: (action: WorkflowAction) => void
  onCreateVariable?: () => void
}

export function SetVariableConfig({
  action,
  variables,
  onChange,
  onCreateVariable,
}: SetVariableConfigProps) {
  // Filter to only custom variables (ones that can be written to)
  const customVariables = variables.filter(
    (v) => v.source.type === "custom" && !v.readOnly
  )

  const handleVariableChange = (variableId: string) => {
    onChange({
      ...action,
      config: {
        ...action.config,
        variableId,
      },
    })
  }

  const handleValueChange = (value: string) => {
    onChange({
      ...action,
      config: {
        ...action.config,
        value,
      },
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Set Variable Value</Label>
        <p className="text-xs text-muted-foreground">
          Choose a custom variable and set its value
        </p>
      </div>

      {/* Variable Selector */}
      <div className="space-y-2">
        <Label htmlFor="variable-select">Variable to Set</Label>
        <Select
          value={action.config.variableId}
          onValueChange={handleVariableChange}
        >
          <SelectTrigger id="variable-select">
            <SelectValue placeholder="Select a custom variable..." />
          </SelectTrigger>
          <SelectContent>
            {customVariables.length === 0 ? (
              <SelectItem value="_none" disabled>
                No custom variables available
              </SelectItem>
            ) : (
              customVariables.map((variable) => (
                <SelectItem key={variable.id} value={variable.id}>
                  {variable.name}
                  {variable.dataType && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({variable.dataType})
                    </span>
                  )}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        {customVariables.length === 0 && onCreateVariable && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateVariable}
            className="w-full"
          >
            <Plus className="mr-2 size-4" />
            Create Custom Variable
          </Button>
        )}

        <p className="text-xs text-muted-foreground">
          Only custom variables can be set. Create one via the "Custom Variables"
          button in the header.
        </p>
      </div>

      {/* Value Selector */}
      {action.config.variableId && (
        <div className="space-y-2">
          <Label htmlFor="variable-value">New Value</Label>
          <VariableSelector
            value={action.config.value}
            onChange={handleValueChange}
            variables={variables}
            allowManualEntry={true}
            placeholder="Enter value or select variable..."
          />
          <p className="text-xs text-muted-foreground">
            Enter a literal value, or select another variable to copy its value
          </p>
        </div>
      )}
    </div>
  )
}
