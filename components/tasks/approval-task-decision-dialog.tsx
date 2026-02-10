"use client"

import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { Calendar, ShieldCheck, User, Workflow, Link2, ExternalLink } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/common/status-badge"
import { getTaskLinks, toTaskLinkHref } from "@/lib/tasks/presentation"
import type { Task } from "@/types"

interface ApprovalTaskDecisionDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove?: (taskId: string, comment?: string) => Promise<void>
  onReject?: (taskId: string, comment?: string) => Promise<void>
}

export function ApprovalTaskDecisionDialog({
  task,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: ApprovalTaskDecisionDialogProps) {
  const [comment, setComment] = useState("")
  const [activeAction, setActiveAction] = useState<"approve" | "reject" | null>(null)

  useEffect(() => {
    setComment("")
  }, [task?.id, open])

  if (!task) {
    return null
  }

  const isPending = !task.outcome
  const links = getTaskLinks(task.metadata)

  const handleApprove = async () => {
    if (!onApprove || !isPending) return
    setActiveAction("approve")
    try {
      await onApprove(task.id, comment.trim() || undefined)
      setComment("")
      onOpenChange(false)
    } catch (error) {
      console.error("Error approving task:", error)
    } finally {
      setActiveAction(null)
    }
  }

  const handleReject = async () => {
    if (!onReject || !isPending) return
    setActiveAction("reject")
    try {
      await onReject(task.id, comment.trim() || undefined)
      setComment("")
      onOpenChange(false)
    } catch (error) {
      console.error("Error rejecting task:", error)
    } finally {
      setActiveAction(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-background to-emerald-50/40 dark:border-amber-900/40 dark:from-amber-950/20 dark:via-background dark:to-emerald-950/15">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle className="text-lg">{task.title}</DialogTitle>
              <DialogDescription>
                Review and submit a decision for this approval task.
              </DialogDescription>
            </div>
            <TaskPriorityBadge priority={task.priority} />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="size-3" />
              Approval
            </Badge>
            <TaskStatusBadge
              status={task.status}
              taskType={task.taskType}
              outcome={task.outcome ?? null}
            />
            {task.workflowExecutionId && (
              <Badge variant="outline" className="gap-1">
                <Workflow className="size-3" />
                Workflow
              </Badge>
            )}
            {task.outcome && (
              <Badge variant="outline">{task.outcome === "approved" ? "Approved" : "Rejected"}</Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {task.description || "No additional context provided."}
          </p>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            {task.assignedTo && (
              <div className="flex items-center gap-1">
                <User className="size-3.5" />
                <span>{task.assignedToName || task.assignedTo}</span>
              </div>
            )}
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                <span>Due {format(parseISO(task.dueDate), "MMM d, yyyy")}</span>
              </div>
            )}
          </div>

          {links.length > 0 && (
            <div className="space-y-1 rounded-md border border-amber-200/70 bg-background/70 p-3 dark:border-amber-900/40">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Links</p>
              {links.map((link) => (
                <a
                  key={link}
                  href={toTaskLinkHref(link)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Link2 className="size-3.5" />
                  <span className="truncate">{link}</span>
                  <ExternalLink className="size-3" />
                </a>
              ))}
            </div>
          )}

          {isPending ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Decision Note
              </p>
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Optional context for this decision..."
                rows={3}
              />
            </div>
          ) : task.outcomeComment ? (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              {task.outcomeComment}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {isPending && (
            <>
              <Button
                variant="outline"
                disabled={activeAction !== null}
                onClick={handleReject}
              >
                {activeAction === "reject" ? "Rejecting..." : "Reject"}
              </Button>
              <Button
                disabled={activeAction !== null}
                onClick={handleApprove}
              >
                {activeAction === "approve" ? "Approving..." : "Approve"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
