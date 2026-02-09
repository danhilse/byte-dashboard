"use client"

import { useState, useEffect, useMemo } from "react"
import { Plus, Loader2 } from "lucide-react"

import { FormDialog } from "@/components/common/form-dialog"
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
}

export function WorkflowCreateDialog({ onCreateWorkflow, trigger }: WorkflowCreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [contactId, setContactId] = useState("")
  const [workflowDefinitionId, setWorkflowDefinitionId] = useState("")
  const [manualStatus, setManualStatus] = useState<string>("draft")

  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [definitions, setDefinitions] = useState<DefinitionOption[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [loadingDefinitions, setLoadingDefinitions] = useState(false)
  const startsImmediately = Boolean(workflowDefinitionId)

  // Derive status options from selected definition
  const selectedDefinition = definitions.find((d) => d.id === workflowDefinitionId)
  const statusOptions = useMemo(() => {
    if (selectedDefinition?.statuses?.length) {
      return [...selectedDefinition.statuses]
        .sort((a, b) => a.order - b.order)
        .map((s) => ({ value: s.id, label: s.label, color: s.color }))
    }
    return Object.entries(fallbackWorkflowStatusConfig).map(([value, config]) => ({
      value,
      label: config.label,
      color: undefined as string | undefined,
    }))
  }, [selectedDefinition])

  const effectiveStatus = useMemo(() => {
    if (selectedDefinition?.statuses?.length) {
      const sorted = [...selectedDefinition.statuses].sort((a, b) => a.order - b.order)
      return sorted[0]?.id ?? manualStatus
    }
    return manualStatus
  }, [selectedDefinition, manualStatus])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setLoadingContacts(true)
      setLoadingDefinitions(true)
    }
  }

  useEffect(() => {
    if (!open) return

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
  }, [open])

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
    setOpen(false)
  }

  const defaultTrigger = (
    <Button>
      <Plus className="mr-2 size-4" />
      New Workflow
    </Button>
  )

  return (
    <FormDialog
      title="Create New Workflow"
      description="Start a new workflow execution for a contact."
      trigger={trigger ?? defaultTrigger}
      open={open}
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
        <Label htmlFor="definition">Workflow Definition (optional)</Label>
        {loadingDefinitions ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
            <Loader2 className="size-4 animate-spin" />
            Loading definitions...
          </div>
        ) : (
          <Select value={workflowDefinitionId} onValueChange={setWorkflowDefinitionId}>
            <SelectTrigger id="definition" className="w-full">
              <SelectValue placeholder="None (manual workflow)" />
            </SelectTrigger>
            <SelectContent>
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
      </div>

      <div className="grid gap-2">
        <Label htmlFor="status">Initial Status</Label>
        <Select
          value={effectiveStatus}
          onValueChange={setManualStatus}
          disabled={startsImmediately}
        >
          <SelectTrigger id="status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex items-center gap-2">
                  {opt.color && (
                    <span
                      className="inline-block size-2 rounded-full"
                      style={{ backgroundColor: opt.color }}
                    />
                  )}
                  {opt.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {startsImmediately && (
          <p className="text-xs text-muted-foreground">
            Status is managed by workflow steps after start.
          </p>
        )}
      </div>
    </FormDialog>
  )
}
