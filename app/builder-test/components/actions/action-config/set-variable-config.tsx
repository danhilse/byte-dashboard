"use client"

import { useState } from "react"
import type { WorkflowAction, WorkflowVariable, VariableDataType } from "../../../types/workflow-v2"
import { Input } from "@/components/ui/input"
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
  onAddVariable?: (variable: WorkflowVariable) => void
}

export function SetVariableConfig({
  action,
  variables,
  onChange,
  onAddVariable,
}: SetVariableConfigProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newVarName, setNewVarName] = useState("")
  const [newVarDataType, setNewVarDataType] = useState<VariableDataType>("text")

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

  const handleCreateVariable = () => {
    if (!newVarName.trim() || !onAddVariable) return

    const newVariable: WorkflowVariable = {
      id: `custom-${Date.now()}`,
      name: newVarName.trim(),
      type: "custom",
      dataType: newVarDataType,
      source: { type: "custom" },
      readOnly: false,
    }

    onAddVariable(newVariable)

    // Auto-select the newly created variable
    onChange({
      ...action,
      config: {
        ...action.config,
        variableId: newVariable.id,
      },
    })

    // Reset form
    setNewVarName("")
    setNewVarDataType("text")
    setShowCreateForm(false)
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

        {/* Inline Create Variable */}
        {onAddVariable && (
          <>
            {!showCreateForm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateForm(true)}
                className="w-full"
              >
                <Plus className="mr-2 size-4" />
                Create New Variable
              </Button>
            ) : (
              <div className="space-y-2 rounded-lg border p-3">
                <Label className="text-xs font-medium text-muted-foreground">
                  New Variable
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    placeholder="Variable name..."
                    className="h-9 text-sm"
                  />
                  <Select
                    value={newVarDataType}
                    onValueChange={(v) => setNewVarDataType(v as VariableDataType)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreateVariable}
                    disabled={!newVarName.trim()}
                    className="flex-1"
                  >
                    Create
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewVarName("")
                      setNewVarDataType("text")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
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
