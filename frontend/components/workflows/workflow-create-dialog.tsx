"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { workflowStatusConfig, workflowPriorityConfig } from "@/lib/status-config"
import type { Workflow, WorkflowStatus } from "@/types"

interface WorkflowCreateDialogProps {
  onCreateWorkflow?: (workflow: Omit<Workflow, "id" | "submittedAt" | "updatedAt">) => void
  trigger?: React.ReactNode
}

export function WorkflowCreateDialog({ onCreateWorkflow, trigger }: WorkflowCreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactId, setContactId] = useState("")
  const [status, setStatus] = useState<WorkflowStatus>("draft")
  const [priority, setPriority] = useState<Workflow["priority"]>("medium")
  const [value, setValue] = useState("")
  const [notes, setNotes] = useState("")
  const [templateName, setTemplateName] = useState("")

  const resetForm = () => {
    setTitle("")
    setContactName("")
    setContactId("")
    setStatus("draft")
    setPriority("medium")
    setValue("")
    setNotes("")
    setTemplateName("")
  }

  const handleSubmit = () => {
    const newWorkflow: Omit<Workflow, "id" | "submittedAt" | "updatedAt"> = {
      title,
      contactName,
      contactId: contactId || `c${Date.now()}`,
      status,
      priority,
      value: value ? parseFloat(value) : 0,
      notes: notes || undefined,
      templateName: templateName || undefined,
      progress: 0,
      taskCount: 0,
      completedTaskCount: 0,
    }

    onCreateWorkflow?.(newWorkflow)
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
      description="Add a new workflow to your pipeline."
      trigger={trigger ?? defaultTrigger}
      open={open}
      onOpenChange={setOpen}
      onSubmit={handleSubmit}
      onCancel={resetForm}
      submitLabel="Create Workflow"
      submitDisabled={!title.trim() || !contactName.trim()}
    >
      <div className="grid gap-2">
        <Label htmlFor="title">Workflow Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter workflow title"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="contactName">Contact Name</Label>
        <Input
          id="contactName"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Enter contact name"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as WorkflowStatus)}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(workflowStatusConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="priority">Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as Workflow["priority"])}>
            <SelectTrigger id="priority" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(workflowPriorityConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="value">Value ($)</Label>
          <Input
            id="value"
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="template">Template (optional)</Label>
          <Select value={templateName} onValueChange={setTemplateName}>
            <SelectTrigger id="template" className="w-full">
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Enterprise Onboarding">Enterprise Onboarding</SelectItem>
              <SelectItem value="Partnership Review">Partnership Review</SelectItem>
              <SelectItem value="Standard Approval">Standard Approval</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes (optional)"
          rows={3}
        />
      </div>
    </FormDialog>
  )
}
