"use client"

import { useState } from "react"
import { Play } from "lucide-react"

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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface WorkflowTriggerDialogProps {
  contacts: Array<{ id: string; firstName: string; lastName: string; email?: string }>
  onTriggerWorkflow: (contactId: string) => Promise<void>
}

/**
 * Workflow Trigger Dialog
 *
 * Simple dialog for testing workflow execution triggering.
 */
export function WorkflowTriggerDialog({
  contacts,
  onTriggerWorkflow,
}: WorkflowTriggerDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState<string>("")
  const [isTriggering, setIsTriggering] = useState(false)

  const handleTrigger = async () => {
    if (!selectedContactId) return

    setIsTriggering(true)
    try {
      await onTriggerWorkflow(selectedContactId)
      setOpen(false)
      setSelectedContactId("")
    } catch (error) {
      console.error("Error triggering workflow:", error)
    } finally {
      setIsTriggering(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Play className="size-4" />
          Trigger Test Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Trigger Workflow Execution</DialogTitle>
          <DialogDescription>
            Start a new workflow execution for testing. This will create tasks and wait
            for approvals.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="contact">Select Contact</Label>
            <Select value={selectedContactId} onValueChange={setSelectedContactId}>
              <SelectTrigger id="contact">
                <SelectValue placeholder="Choose a contact..." />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                    {contact.email && ` (${contact.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border p-3 bg-muted/50 text-sm">
            <p className="font-medium mb-1">This workflow will:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Create a review task (assigned to reviewer role)</li>
              <li>Wait for review completion</li>
              <li>Create an approval task (assigned to manager role)</li>
              <li>Wait for approval/rejection</li>
              <li>Send email and update status based on outcome</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isTriggering}>
            Cancel
          </Button>
          <Button
            onClick={handleTrigger}
            disabled={!selectedContactId || isTriggering}
          >
            <Play className="mr-2 size-4" />
            {isTriggering ? "Starting..." : "Start Workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
