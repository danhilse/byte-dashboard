"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { applicationStatusConfig, applicationPriorityConfig } from "@/lib/status-config"
import type { Application, ApplicationStatus } from "@/types"

interface ApplicationCreateDialogProps {
  onCreateApplication?: (app: Omit<Application, "id" | "submittedAt" | "updatedAt">) => void
  trigger?: React.ReactNode
}

export function ApplicationCreateDialog({ onCreateApplication, trigger }: ApplicationCreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactId, setContactId] = useState("")
  const [status, setStatus] = useState<ApplicationStatus>("draft")
  const [priority, setPriority] = useState<Application["priority"]>("medium")
  const [value, setValue] = useState("")
  const [notes, setNotes] = useState("")
  const [workflowName, setWorkflowName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newApp: Omit<Application, "id" | "submittedAt" | "updatedAt"> = {
      title,
      contactName,
      contactId: contactId || `c${Date.now()}`,
      status,
      priority,
      value: value ? parseFloat(value) : 0,
      notes: notes || undefined,
      workflowName: workflowName || undefined,
      progress: 0,
      taskCount: 0,
      completedTaskCount: 0,
    }

    onCreateApplication?.(newApp)
    resetForm()
    setOpen(false)
  }

  const resetForm = () => {
    setTitle("")
    setContactName("")
    setContactId("")
    setStatus("draft")
    setPriority("medium")
    setValue("")
    setNotes("")
    setWorkflowName("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 size-4" />
            New Application
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Application</DialogTitle>
            <DialogDescription>
              Add a new application to your pipeline.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Application Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter application title"
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
                <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(applicationStatusConfig).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Application["priority"])}>
                  <SelectTrigger id="priority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(applicationPriorityConfig).map(([value, config]) => (
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
                <Label htmlFor="workflow">Workflow (optional)</Label>
                <Select value={workflowName} onValueChange={setWorkflowName}>
                  <SelectTrigger id="workflow" className="w-full">
                    <SelectValue placeholder="Select workflow" />
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !contactName.trim()}>
              Create Application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
