"use client"

import { useEffect } from "react"
import type { WorkflowAction, WorkflowVariable, WorkflowStatus } from "../../../types/workflow-v2"
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
import { FieldValueInput } from "../../field-value-input"
import { taskFieldConfig } from "@/lib/task-fields-config"
import { getRuntimeWritableFields } from "@/lib/field-registry"

interface UpdateTaskConfigProps {
  action: Extract<WorkflowAction, { type: "update_task" }>
  variables: WorkflowVariable[]
  statuses: WorkflowStatus[]
  onChange: (action: WorkflowAction) => void
}

export function UpdateTaskConfig({ action, variables, statuses, onChange }: UpdateTaskConfigProps) {
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

  const runtimeWritableTaskFields = getRuntimeWritableFields("task")

  // Get task variables from earlier actions (create_task outputs)
  const taskVariables = variables.filter(
    (v) => v.type === "task" && v.source.type === "action_output"
  )

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
    if (key === "field") {
      // Clear value when field name changes to avoid stale data
      newFields[index] = { field: value, value: "" }
    } else {
      newFields[index] = { ...newFields[index], [key]: value }
    }
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
        <Label htmlFor={`${action.id}-taskActionId`}>Task to Update</Label>
        {taskVariables.length > 0 ? (
          <Select
            value={action.config.taskActionId}
            onValueChange={handleTaskActionIdChange}
          >
            <SelectTrigger id={`${action.id}-taskActionId`}>
              <SelectValue placeholder="Select a task from earlier steps..." />
            </SelectTrigger>
            <SelectContent>
              {taskVariables.map((v) => (
                <SelectItem
                  key={v.source.type === "action_output" ? v.source.actionId : v.id}
                  value={v.source.type === "action_output" ? v.source.actionId : v.id}
                >
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
            No tasks created in earlier steps. Add a Create Task action first.
          </p>
        )}
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
          {action.config.fields.map((field, index) => {
            const fieldConfig = field.field
              ? taskFieldConfig[field.field as keyof typeof taskFieldConfig]
              : undefined

            // Runtime rejects setting task status to "done" (generic-workflow.ts:613)
            const excludeValues = field.field === "status" ? ["done"] : undefined

            return (
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
                        {runtimeWritableTaskFields.map((fieldDef) => (
                          <SelectItem key={fieldDef.key} value={fieldDef.key}>
                            {fieldDef.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`field-value-${index}`} className="text-xs">
                      New Value
                    </Label>
                    {fieldConfig ? (
                      <FieldValueInput
                        inputType={fieldConfig.inputType}
                        value={field.value}
                        onChange={(value) => handleFieldChange(index, "value", value)}
                        statuses={statuses}
                        className="h-9 text-sm"
                        placeholder={`Enter ${fieldConfig.label.toLowerCase()}...`}
                        excludeValues={excludeValues}
                      />
                    ) : (
                      <FieldValueInput
                        inputType="text"
                        value={field.value}
                        onChange={(value) => handleFieldChange(index, "value", value)}
                        className="h-9 text-sm"
                        placeholder="Select a field first..."
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Button variant="outline" size="sm" onClick={handleAddField} className="w-full">
        <Plus className="mr-2 size-4" />
        Add Another Field
      </Button>
    </div>
  )
}
