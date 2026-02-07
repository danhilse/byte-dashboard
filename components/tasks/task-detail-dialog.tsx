"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Calendar, User, Tag, Trash2, Workflow, CheckCircle2, XCircle } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { TaskStatusBadge, TaskPriorityBadge } from "@/components/common/status-badge"
import { taskStatusConfig, taskPriorityConfig } from "@/lib/status-config"
import { useDetailDialogEdit } from "@/hooks/use-detail-dialog-edit"
import type { Task, TaskStatus, TaskPriority } from "@/types"

interface TaskDetailDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateTask?: (task: Task) => void
  onDeleteTask?: (taskId: string) => void
  onApprove?: (taskId: string, comment?: string) => Promise<void>
  onReject?: (taskId: string, comment?: string) => Promise<void>
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onUpdateTask,
  onDeleteTask,
  onApprove,
  onReject,
}: TaskDetailDialogProps) {
  const [approvalComment, setApprovalComment] = useState("")
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const {
    isEditing,
    editedItem: editedTask,
    displayItem: displayTask,
    handleEdit,
    handleSave,
    handleCancel,
    handleDelete,
    updateField,
    handleQuickStatusUpdate,
  } = useDetailDialogEdit({
    item: task,
    onUpdate: onUpdateTask,
    onDelete: onDeleteTask,
    onClose: () => onOpenChange(false),
  })

  const handleApprove = async () => {
    if (!task || !onApprove) return
    setIsApproving(true)
    try {
      await onApprove(task.id, approvalComment || undefined)
      setApprovalComment("")
      onOpenChange(false)
    } catch (error) {
      console.error("Error approving task:", error)
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!task || !onReject) return
    setIsRejecting(true)
    try {
      await onReject(task.id, approvalComment || undefined)
      setApprovalComment("")
      onOpenChange(false)
    } catch (error) {
      console.error("Error rejecting task:", error)
    } finally {
      setIsRejecting(false)
    }
  }

  if (!task || !displayTask) return null

  const isApprovalTask = displayTask.taskType === "approval"
  const isApprovalPending = isApprovalTask && !displayTask.outcome

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editedTask?.title ?? ""}
                  onChange={(e) => updateField("title", e.target.value)}
                  className="text-lg font-semibold"
                />
              ) : (
                <DialogTitle className="text-lg">{displayTask.title}</DialogTitle>
              )}
            </div>
            <div className="flex items-center gap-2">
              <TaskPriorityBadge priority={displayTask.priority} />
              {displayTask.source === "workflow" && (
                <Badge variant="outline" className="gap-1">
                  <Workflow className="size-3" />
                  Workflow
                </Badge>
              )}
            </div>
          </div>
          <DialogDescription className="sr-only">
            Task details and actions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label className="text-muted-foreground text-xs uppercase">Status</Label>
            {isEditing ? (
              <Select
                value={editedTask?.status}
                onValueChange={(v) => updateField("status", v as TaskStatus)}
              >
                <SelectTrigger className="w-[180px]">
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
            ) : (
              <div className="flex items-center gap-2">
                <TaskStatusBadge status={displayTask.status} />
                <div className="flex gap-1">
                  {(["backlog", "todo", "in_progress", "done"] as TaskStatus[])
                    .filter((s) => s !== displayTask.status)
                    .map((status) => (
                      <Button
                        key={status}
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleQuickStatusUpdate(status)}
                      >
                        Move to {taskStatusConfig[status].label}
                      </Button>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label className="text-muted-foreground text-xs uppercase">Description</Label>
            {isEditing ? (
              <Textarea
                value={editedTask?.description ?? ""}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Add a description..."
                rows={3}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {displayTask.description || "No description provided."}
              </p>
            )}
          </div>

          {isEditing ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <Select
                  value={editedTask?.priority}
                  onValueChange={(v) => updateField("priority", v as TaskPriority)}
                >
                  <SelectTrigger id="edit-priority">
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

              <div className="grid gap-2">
                <Label htmlFor="edit-assignee">Assignee</Label>
                <Input
                  id="edit-assignee"
                  value={editedTask?.assignee ?? ""}
                  onChange={(e) => updateField("assignee", e.target.value || undefined)}
                  placeholder="Assignee name"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 text-sm">
              {displayTask.assignee && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="size-4" />
                  <span>{displayTask.assignee}</span>
                </div>
              )}
              {displayTask.dueDate && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="size-4" />
                  <span>{format(new Date(displayTask.dueDate), "MMM d, yyyy")}</span>
                </div>
              )}
            </div>
          )}

          {displayTask.tags && displayTask.tags.length > 0 && (
            <div className="grid gap-2">
              <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1">
                <Tag className="size-3" />
                Tags
              </Label>
              <div className="flex flex-wrap gap-1">
                {displayTask.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {isApprovalTask && (
            <div className="grid gap-3 rounded-lg border p-4 bg-muted/50">
              <Label className="text-xs uppercase font-semibold">Approval Decision</Label>
              {displayTask.outcome ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {displayTask.outcome === "approved" ? (
                      <Badge className="gap-1 bg-green-500">
                        <CheckCircle2 className="size-3" />
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="size-3" />
                        Rejected
                      </Badge>
                    )}
                  </div>
                  {displayTask.outcomeComment && (
                    <div className="text-sm">
                      <span className="font-medium">Comment: </span>
                      {displayTask.outcomeComment}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    placeholder="Add a comment (optional)..."
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleApprove}
                      disabled={isApproving || isRejecting}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="mr-2 size-4" />
                      {isApproving ? "Approving..." : "Approve"}
                    </Button>
                    <Button
                      onClick={handleReject}
                      disabled={isApproving || isRejecting}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="mr-2 size-4" />
                      {isRejecting ? "Rejecting..." : "Reject"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-2 border-t">
            Created {format(new Date(displayTask.createdAt), "MMM d, yyyy")} &bull; Updated{" "}
            {format(new Date(displayTask.updatedAt), "MMM d, yyyy")}
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="mr-2 size-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Task</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{task.title}&quot;? This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save Changes</Button>
              </>
            ) : (
              !isApprovalPending && (
                <Button variant="outline" onClick={handleEdit}>
                  Edit Task
                </Button>
              )
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
