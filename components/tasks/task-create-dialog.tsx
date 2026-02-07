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
import { taskStatusConfig, taskPriorityConfig } from "@/lib/status-config"
import type { Task, TaskStatus, TaskPriority } from "@/types"

interface TaskCreateDialogProps {
  onCreateTask?: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => void
  trigger?: React.ReactNode
}

export function TaskCreateDialog({ onCreateTask, trigger }: TaskCreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<TaskStatus>("todo")
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [assignedTo, setAssignedTo] = useState("")
  const [dueDate, setDueDate] = useState("")

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setStatus("todo")
    setPriority("medium")
    setAssignedTo("")
    setDueDate("")
  }

  const handleSubmit = () => {
    const newTask: Omit<Task, "id" | "createdAt" | "updatedAt"> = {
      orgId: "",
      title,
      description: description || undefined,
      taskType: "standard",
      status,
      priority,
      position: 0,
      metadata: {},
      assignedTo: assignedTo || undefined,
      dueDate: dueDate || undefined,
    }

    onCreateTask?.(newTask)
    resetForm()
    setOpen(false)
  }

  const defaultTrigger = (
    <Button>
      <Plus className="mr-2 size-4" />
      New Task
    </Button>
  )

  return (
    <FormDialog
      title="Create New Task"
      description="Add a new task to your work list."
      trigger={trigger ?? defaultTrigger}
      open={open}
      onOpenChange={setOpen}
      onSubmit={handleSubmit}
      onCancel={resetForm}
      submitLabel="Create Task"
      submitDisabled={!title.trim()}
    >
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter task description (optional)"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(taskStatusConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="priority">Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
            <SelectTrigger id="priority" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(taskPriorityConfig).map(([value, config]) => (
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
          <Label htmlFor="assignedTo">Assigned To</Label>
          <Input
            id="assignedTo"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="User ID (optional)"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>
    </FormDialog>
  )
}
