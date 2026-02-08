"use client"

import { useState } from "react"
import { Plus, Trash2, Edit2, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmailValueSelector } from "./email-value-selector"
import type { WorkflowVariable, VariableDataType } from "../types/workflow-v2"

interface CustomVariablesDialogProps {
  variables: WorkflowVariable[]
  onChange: (variables: WorkflowVariable[]) => void
}

const dataTypeLabels: Record<VariableDataType, string> = {
  email: "Email",
  text: "Text",
  number: "Number",
  date: "Date",
  boolean: "Yes/No",
  user: "User",
}

export function CustomVariablesDialog({ variables, onChange }: CustomVariablesDialogProps) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    dataType: "text" as VariableDataType,
    value: "",
  })

  const customVariables = variables.filter((v) => v.type === "custom")

  const handleAdd = () => {
    if (!formData.name.trim() || !formData.value.trim()) return

    const newVariable: WorkflowVariable = {
      id: `custom-${Date.now()}`,
      name: formData.name.trim(),
      type: "custom",
      dataType: formData.dataType,
      source: {
        type: "custom",
        value: formData.value.trim(),
      },
      readOnly: false,
    }

    onChange([...variables, newVariable])
    resetForm()
  }

  const handleUpdate = () => {
    if (!editingId || !formData.name.trim() || !formData.value.trim()) return

    const updatedVariables = variables.map((v) =>
      v.id === editingId
        ? {
            ...v,
            name: formData.name.trim(),
            dataType: formData.dataType,
            source: {
              type: "custom" as const,
              value: formData.value.trim(),
            },
          }
        : v
    )

    onChange(updatedVariables)
    resetForm()
  }

  const handleDataTypeChange = (dataType: VariableDataType) => {
    // Clear value when data type changes since it might not be valid
    setFormData({ ...formData, dataType, value: "" })
  }

  const handleDelete = (id: string) => {
    onChange(variables.filter((v) => v.id !== id))
  }

  const handleEdit = (variable: WorkflowVariable) => {
    setEditingId(variable.id)
    setFormData({
      name: variable.name,
      dataType: variable.dataType || "text",
      value:
        typeof variable.source === "object" && variable.source.type === "custom"
          ? String(variable.source.value || "")
          : "",
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setFormData({
      name: "",
      dataType: "text",
      value: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 size-4" />
          Manage Variables
          {customVariables.length > 0 && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {customVariables.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Custom Variables</DialogTitle>
          <DialogDescription>
            Define reusable variables for this workflow. These can be referenced in any action
            (e.g., support email, manager name, default values).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add/Edit Form */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {editingId ? "Edit Variable" : "Add New Variable"}
              </Label>
              {editingId && (
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="variable-name" className="text-xs">
                    Variable Name
                  </Label>
                  <Input
                    id="variable-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., support_email"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="variable-type" className="text-xs">
                    Data Type
                  </Label>
                  <Select value={formData.dataType} onValueChange={handleDataTypeChange}>
                    <SelectTrigger id="variable-type" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(dataTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="variable-value" className="text-xs">
                  Value
                </Label>
                {formData.dataType === "text" ? (
                  <Textarea
                    id="variable-value"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="e.g., Welcome to our service!"
                    rows={3}
                  />
                ) : formData.dataType === "email" ? (
                  <EmailValueSelector
                    value={formData.value}
                    onChange={(value) => setFormData({ ...formData, value })}
                    placeholder="Select from users/contacts or enter manually..."
                    className="w-full"
                  />
                ) : (
                  <Input
                    id="variable-value"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder={
                      formData.dataType === "number"
                        ? "e.g., 100"
                        : formData.dataType === "date"
                          ? "e.g., 2024-01-01"
                          : "Enter value..."
                    }
                    type={
                      formData.dataType === "number"
                        ? "number"
                        : formData.dataType === "date"
                          ? "date"
                          : "text"
                    }
                    className="h-9"
                  />
                )}
              </div>
            </div>

            <Button
              onClick={editingId ? handleUpdate : handleAdd}
              disabled={!formData.name.trim() || !formData.value.trim()}
              className="w-full"
              size="sm"
            >
              {editingId ? (
                <>
                  <Edit2 className="mr-2 size-4" />
                  Update Variable
                </>
              ) : (
                <>
                  <Plus className="mr-2 size-4" />
                  Add Variable
                </>
              )}
            </Button>
          </div>

          {/* Variables List */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Defined Variables ({customVariables.length})
            </Label>

            {customVariables.length > 0 ? (
              <div className="space-y-2">
                {customVariables.map((variable) => (
                  <div
                    key={variable.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-0.5 text-sm font-medium">
                          var-{variable.id}.{variable.name}
                        </code>
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {dataTypeLabels[variable.dataType || "text"]}
                        </span>
                      </div>
                      {variable.source.type === "custom" && variable.source.value && (
                        <p className="text-xs text-muted-foreground">
                          Value: {String(variable.source.value)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEdit(variable)}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(variable.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No custom variables defined yet. Add one above to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
