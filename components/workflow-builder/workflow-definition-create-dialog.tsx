"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Loader2, Plus } from "lucide-react"

import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { WorkflowDefinition } from "@/types"
import { DEFAULT_DEFINITION_STATUSES } from "@/lib/workflow-builder-v2/status-guardrails"

interface WorkflowDefinitionCreateDialogProps {
  onDefinitionCreated?: (definition: WorkflowDefinition) => void
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function WorkflowDefinitionCreateDialog({
  onDefinitionCreated,
  trigger,
  open,
  onOpenChange,
}: WorkflowDefinitionCreateDialogProps) {
  const { toast } = useToast()

  const [internalOpen, setInternalOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const trimmedName = useMemo(() => name.trim(), [name])
  const canSubmit = trimmedName.length > 0 && !isSubmitting
  const dialogOpen = open ?? internalOpen

  const resetForm = () => {
    setName("")
    setDescription("")
    setIsSubmitting(false)
  }

  const setDialogOpen = (nextOpen: boolean) => {
    if (open === undefined) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setDialogOpen(nextOpen)
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
          statuses: DEFAULT_DEFINITION_STATUSES,
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

      onDefinitionCreated?.(definition)
      handleOpenChange(false)

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
      trigger={trigger !== undefined ? trigger : defaultTrigger}
      open={dialogOpen}
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
      {isSubmitting && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Creating definition...
        </div>
      )}
    </FormDialog>
  )
}
