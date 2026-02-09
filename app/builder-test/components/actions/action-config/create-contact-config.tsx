"use client"

import { useEffect } from "react"
import type { WorkflowAction, WorkflowVariable } from "../../../types/workflow-v2"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { FieldValueInput } from "../../field-value-input"
import { allContactFields, contactFieldConfig } from "@/lib/contact-fields-config"
import type { ContactField } from "@/lib/contact-fields-config"

interface CreateContactConfigProps {
  action: Extract<WorkflowAction, { type: "create_contact" }>
  variables: WorkflowVariable[]
  onChange: (action: WorkflowAction) => void
}

export function CreateContactConfig({
  action,
  variables,
  onChange,
}: CreateContactConfigProps) {
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

  const handleContactTypeChange = (contactType: "reference" | "secondary") => {
    onChange({
      ...action,
      config: {
        ...action.config,
        contactType,
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
        <Label htmlFor={`${action.id}-contactType`}>Contact Type</Label>
        <Select
          value={action.config.contactType}
          onValueChange={handleContactTypeChange}
        >
          <SelectTrigger id={`${action.id}-contactType`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reference">Reference</SelectItem>
            <SelectItem value="secondary">Secondary Contact</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Type of contact to create (e.g., reference, emergency contact)
        </p>
      </div>

      <div>
        <Label>Contact Fields</Label>
        <p className="text-xs text-muted-foreground">
          Specify fields for the new contact
        </p>
      </div>

      {action.config.fields.length > 0 && (
        <div className="space-y-3">
          {action.config.fields.map((field, index) => {
            const fieldConfig = field.field
              ? contactFieldConfig[field.field as ContactField]
              : undefined

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
                        {allContactFields.map((fieldName) => (
                          <SelectItem key={fieldName} value={fieldName}>
                            {contactFieldConfig[fieldName].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`field-value-${index}`} className="text-xs">
                      Value
                    </Label>
                    {fieldConfig ? (
                      <FieldValueInput
                        inputType={fieldConfig.inputType}
                        value={field.value}
                        onChange={(value) => handleFieldChange(index, "value", value)}
                        className="h-9 text-sm"
                        placeholder={`Enter ${fieldConfig.label.toLowerCase()}...`}
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
