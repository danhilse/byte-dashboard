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
  const [assignee, setAssignee] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [tags, setTags] = useState("")

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setStatus("todo")
    setPriority("medium")
    setAssignee("")
    setDueDate("")
    setTags("")
  }

  const handleSubmit = () => {
    const newTask: Omit<Task, "id" | "createdAt" | "updatedAt"> = {
      title,
      description: description || undefined,
      status,
      priority,
      assignee: assignee || undefined,
      dueDate: dueDate || undefined,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      source: "manual",
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
          <Label htmlFor="assignee">Assignee</Label>
          <Input
            id="assignee"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="Assignee name (optional)"
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

      <div className="grid gap-2">
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Comma-separated tags (e.g., urgent, sales)"
        />
      </div>
    </FormDialog>
  )
}
