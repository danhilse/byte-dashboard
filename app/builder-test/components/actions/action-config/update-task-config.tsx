"use client"

import { useEffect } from "react"
import type { WorkflowAction, WorkflowVariable } from "../../../types/workflow-v2"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { VariableSelector } from "../../variable-selector"
import { allTaskFields, taskFieldConfig } from "@/lib/task-fields-config"

interface UpdateTaskConfigProps {
  action: Extract<WorkflowAction, { type: "update_task" }>
  variables: WorkflowVariable[]
  onChange: (action: WorkflowAction) => void
}

export function UpdateTaskConfig({ action, variables, onChange }: UpdateTaskConfigProps) {
  // Auto-initialize with one empty field if none exist
  useEffect(() => {
    if (action.config.fields.length === 0) {
      onChange({
        ...action,
        config: {
          ...action.config,
          fields: [{ field: "", value: "" }],
        },
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTaskActionIdChange = (taskActionId: string) => {
    onChange({
      ...action,
      config: {
        ...action.config,
        taskActionId,
      },
    })
  }

  const handleAddField = () => {
    onChange({
      ...action,
      config: {
        ...action.config,
        fields: [...action.config.fields, { field: "", value: "" }],
      },
    })
  }

  const handleRemoveField = (index: number) => {
    onChange({
      ...action,
      config: {
        ...action.config,
        fields: action.config.fields.filter((_, i) => i !== index),
      },
    })
  }

  const handleFieldChange = (
    index: number,
    key: "field" | "value",
    value: string
  ) => {
    const newFields = [...action.config.fields]
    newFields[index] = { ...newFields[index], [key]: value }
    onChange({
      ...action,
      config: {
        ...action.config,
        fields: newFields,
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${action.id}-taskActionId`}>Task Action ID</Label>
        <Input
          id={`${action.id}-taskActionId`}
          value={action.config.taskActionId}
          onChange={(e) => handleTaskActionIdChange(e.target.value)}
          placeholder="ID of the create_task action (e.g., action-1)"
        />
        <p className="text-xs text-muted-foreground">
          References a task created earlier in this workflow
        </p>
      </div>

      <div>
        <Label>Update Task Fields</Label>
        <p className="text-xs text-muted-foreground">
          Choose which fields to update and set their new values
        </p>
      </div>

      {action.config.fields.length > 0 && (
        <div className="space-y-3">
          {action.config.fields.map((field, index) => (
            <div key={index} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">
                  Field {index + 1}
                </Label>
                {action.config.fields.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleRemoveField(index)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`field-name-${index}`} className="text-xs">
                    Field Name
                  </Label>
                  <Select
                    value={field.field}
                    onValueChange={(value) => handleFieldChange(index, "field", value)}
                  >
                    <SelectTrigger id={`field-name-${index}`} className="h-9 text-sm">
                      <SelectValue placeholder="Select field..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allTaskFields.map((fieldName) => (
                        <SelectItem key={fieldName} value={fieldName}>
                          {taskFieldConfig[fieldName].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`field-value-${index}`} className="text-xs">
                    New Value
                  </Label>
                  <VariableSelector
                    value={field.value}
                    onChange={(value) => handleFieldChange(index, "value", value)}
                    variables={variables}
                    filterByDataType="text"
                    allowManualEntry={true}
                    placeholder="Select or enter value..."
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" onClick={handleAddField} className="w-full">
        <Plus className="mr-2 size-4" />
        Add Another Field
      </Button>
    </div>
  )
}
