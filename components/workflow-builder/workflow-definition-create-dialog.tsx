"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Loader2, Plus } from "lucide-react"

import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { DefinitionStatus, WorkflowDefinition } from "@/types"

const DEFAULT_INITIAL_STATUSES: DefinitionStatus[] = [
  { id: "draft", label: "Draft", order: 0, color: "#64748b" },
  { id: "in_review", label: "In Review", order: 1, color: "#3b82f6" },
  { id: "approved", label: "Approved", order: 2, color: "#22c55e" },
  { id: "rejected", label: "Rejected", order: 3, color: "#ef4444" },
]

interface WorkflowDefinitionCreateDialogProps {
  onDefinitionCreated: (definition: WorkflowDefinition) => void
  trigger?: ReactNode
}

export function WorkflowDefinitionCreateDialog({
  onDefinitionCreated,
  trigger,
}: WorkflowDefinitionCreateDialogProps) {
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [seedInitialStatuses, setSeedInitialStatuses] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const trimmedName = useMemo(() => name.trim(), [name])
  const canSubmit = trimmedName.length > 0 && !isSubmitting

  const resetForm = () => {
    setName("")
    setDescription("")
    setSeedInitialStatuses(true)
    setIsSubmitting(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/workflow-definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
          statuses: seedInitialStatuses ? DEFAULT_INITIAL_STATUSES : undefined,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to create workflow definition")
      }

      const definition = payload?.definition as WorkflowDefinition | undefined

      if (!definition) {
        throw new Error("Invalid API response while creating workflow definition")
      }

      onDefinitionCreated(definition)
      setOpen(false)
      resetForm()

      toast({
        title: "Definition created",
        description: "Workflow definition created successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create workflow definition.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const defaultTrigger = (
    <Button>
      <Plus className="mr-2 size-4" />
      New Definition
    </Button>
  )

  return (
    <FormDialog
      title="Create Workflow Definition"
      description="Create a workflow definition, then continue editing in the builder page."
      trigger={trigger ?? defaultTrigger}
      open={open}
      onOpenChange={handleOpenChange}
      onSubmit={handleSubmit}
      onCancel={resetForm}
      submitLabel={isSubmitting ? "Creating..." : "Create Definition"}
      submitDisabled={!canSubmit}
      maxWidth="md"
    >
      <div className="grid gap-2">
        <Label htmlFor="definition-name">Name</Label>
        <Input
          id="definition-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Loan Application Review"
          autoFocus
          disabled={isSubmitting}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="definition-description">Description</Label>
        <Textarea
          id="definition-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional description"
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      <div className="rounded-lg border p-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id="seed-initial-statuses"
            checked={seedInitialStatuses}
            onCheckedChange={(checked) => setSeedInitialStatuses(checked === true)}
            disabled={isSubmitting}
          />
          <div className="grid gap-1">
            <Label htmlFor="seed-initial-statuses" className="font-medium">
              Seed initial statuses
            </Label>
            <p className="text-xs text-muted-foreground">
              Adds Draft, In Review, Approved, and Rejected.
            </p>
          </div>
        </div>
      </div>

      {isSubmitting && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Creating definition...
        </div>
      )}
    </FormDialog>
  )
}
