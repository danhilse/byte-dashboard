"use client"

import { useState, useEffect, useMemo } from "react"
import { Plus, Loader2 } from "lucide-react"

import { FormDialog } from "@/components/common/form-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fallbackWorkflowStatusConfig } from "@/lib/status-config"
import type { DefinitionStatus } from "@/types"

interface ContactOption {
  id: string
  firstName: string
  lastName: string
  email?: string | null
}

interface DefinitionOption {
  id: string
  name: string
  description?: string | null
  version: number
  statuses?: DefinitionStatus[]
}

interface WorkflowCreateDialogProps {
  onCreateWorkflow?: (data: {
    contactId: string
    workflowDefinitionId?: string
    status: string
  }) => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function WorkflowCreateDialog({
  onCreateWorkflow,
  trigger,
  open,
  onOpenChange,
}: WorkflowCreateDialogProps) {
  const MANUAL_EXECUTION_OPTION = "__manual_execution__"
  const [internalOpen, setInternalOpen] = useState(false)
  const [contactId, setContactId] = useState("")
  const [workflowDefinitionId, setWorkflowDefinitionId] = useState("")
  const [manualStatus, setManualStatus] = useState<string>("draft")

  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [definitions, setDefinitions] = useState<DefinitionOption[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [loadingDefinitions, setLoadingDefinitions] = useState(false)
  const startsImmediately = Boolean(workflowDefinitionId)
  const dialogOpen = open ?? internalOpen

  // Derive status options from selected definition
  const selectedDefinition = definitions.find((d) => d.id === workflowDefinitionId)
  const definitionStatusOptions = useMemo(() => {
    if (selectedDefinition?.statuses?.length) {
      return [...selectedDefinition.statuses]
        .sort((a, b) => a.order - b.order)
        .map((s) => ({ value: s.id, label: s.label, color: s.color }))
    }
    return []
  }, [selectedDefinition])

  const manualStatusOptions = useMemo(
    () =>
      Object.entries(fallbackWorkflowStatusConfig).map(([value, config]) => ({
        value,
        label: config.label,
        color: undefined as string | undefined,
      })),
    []
  )

  const effectiveStatus = useMemo(() => {
    if (startsImmediately) {
      return definitionStatusOptions[0]?.value ?? "running"
    }
    return manualStatus
  }, [startsImmediately, definitionStatusOptions, manualStatus])

  const handleOpenChange = (nextOpen: boolean) => {
    if (open === undefined) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)

    if (nextOpen) {
      setLoadingContacts(true)
      setLoadingDefinitions(true)
    }
  }

  useEffect(() => {
    if (!dialogOpen) return

    fetch("/api/contacts")
      .then((res) => res.json())
      .then((data) => setContacts(data.contacts || []))
      .catch(console.error)
      .finally(() => setLoadingContacts(false))

    fetch("/api/workflow-definitions")
      .then((res) => res.json())
      .then((data) => setDefinitions(data.definitions || []))
      .catch(console.error)
      .finally(() => setLoadingDefinitions(false))
  }, [dialogOpen])

  const resetForm = () => {
    setContactId("")
    setWorkflowDefinitionId("")
    setManualStatus("draft")
  }

  const handleSubmit = () => {
    onCreateWorkflow?.({
      contactId,
      workflowDefinitionId: workflowDefinitionId || undefined,
      status: effectiveStatus,
    })
    resetForm()
    handleOpenChange(false)
  }

  const defaultTrigger = (
    <Button>
      <Plus className="mr-2 size-4" />
      Run Workflow
    </Button>
  )

  return (
    <FormDialog
      title="Run Workflow"
      description="Start a workflow execution for a contact from this page."
      trigger={trigger !== undefined ? trigger : defaultTrigger}
      open={dialogOpen}
      onOpenChange={handleOpenChange}
      onSubmit={handleSubmit}
      onCancel={resetForm}
      submitLabel={startsImmediately ? "Start Workflow" : "Create Workflow"}
      submitDisabled={!contactId}
    >
      <div className="grid gap-2">
        <Label htmlFor="contact">Contact *</Label>
        {loadingContacts ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
            <Loader2 className="size-4 animate-spin" />
            Loading contacts...
          </div>
        ) : (
          <Select value={contactId} onValueChange={setContactId}>
            <SelectTrigger id="contact" className="w-full">
              <SelectValue placeholder="Select a contact" />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((contact) => (
                <SelectItem key={contact.id} value={contact.id}>
                  {contact.firstName} {contact.lastName}
                  {contact.email ? ` (${contact.email})` : ""}
                </SelectItem>
              ))}
              {contacts.length === 0 && (
                <div className="p-2 text-sm text-muted-foreground">No contacts found</div>
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="definition">Workflow Definition</Label>
        {loadingDefinitions ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
            <Loader2 className="size-4 animate-spin" />
            Loading definitions...
          </div>
        ) : (
          <Select
            value={workflowDefinitionId || MANUAL_EXECUTION_OPTION}
            onValueChange={(value) =>
              setWorkflowDefinitionId(value === MANUAL_EXECUTION_OPTION ? "" : value)
            }
          >
            <SelectTrigger id="definition" className="w-full">
              <SelectValue placeholder="Select a definition to run" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={MANUAL_EXECUTION_OPTION}>
                None (manual execution)
              </SelectItem>
              {definitions.map((def) => (
                <SelectItem key={def.id} value={def.id}>
                  {def.name} (v{def.version})
                </SelectItem>
              ))}
              {definitions.length === 0 && (
                <div className="p-2 text-sm text-muted-foreground">No definitions found</div>
              )}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-muted-foreground">
          Selecting a definition starts it immediately. Leave as manual execution to create an unscripted
          workflow instance.
        </p>
      </div>

      {startsImmediately ? (
        <div className="grid gap-2">
          <Label>Definition Statuses</Label>
          {definitionStatusOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {definitionStatusOptions.map((opt) => (
                <Badge key={opt.value} variant="secondary" className="gap-1.5">
                  {opt.color && (
                    <span
                      className="inline-block size-2 rounded-full"
                      style={{ backgroundColor: opt.color }}
                    />
                  )}
                  {opt.label}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This definition has no configured statuses; the run will initialize as running.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Status values for this run come from the selected workflow definition.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="status">Initial Status</Label>
          <Select value={effectiveStatus} onValueChange={setManualStatus}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {manualStatusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </FormDialog>
  )
}
