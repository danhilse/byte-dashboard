"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Trash2, Workflow, DollarSign, CheckCircle2 } from "lucide-react"

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
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { ApplicationStatusBadge, ApplicationPriorityBadge } from "@/components/common"
import { applicationStatusConfig, applicationPriorityConfig } from "@/lib/status-config"
import { formatCurrency } from "@/lib/utils"
import type { Application, ApplicationStatus } from "@/types"

interface ApplicationDetailDialogProps {
  application: Application | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateApplication?: (app: Application) => void
  onDeleteApplication?: (appId: string) => void
}

export function ApplicationDetailDialog({
  application,
  open,
  onOpenChange,
  onUpdateApplication,
  onDeleteApplication,
}: ApplicationDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedApp, setEditedApp] = useState<Application | null>(null)

  const handleEdit = () => {
    setEditedApp(application)
    setIsEditing(true)
  }

  const handleSave = () => {
    if (editedApp) {
      onUpdateApplication?.(editedApp)
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditedApp(null)
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (application) {
      onDeleteApplication?.(application.id)
      onOpenChange(false)
    }
  }

  const handleStatusChange = (status: ApplicationStatus) => {
    if (application) {
      onUpdateApplication?.({ ...application, status })
    }
  }

  if (!application) return null

  const displayApp = isEditing && editedApp ? editedApp : application
  const initials = displayApp.contactName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarImage src={displayApp.contactAvatarUrl} alt={displayApp.contactName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                {isEditing ? (
                  <Input
                    value={editedApp?.title ?? ""}
                    onChange={(e) =>
                      setEditedApp((prev) => (prev ? { ...prev, title: e.target.value } : null))
                    }
                    className="text-lg font-semibold"
                  />
                ) : (
                  <DialogTitle className="text-lg">{displayApp.title}</DialogTitle>
                )}
                <p className="text-sm text-muted-foreground">{displayApp.contactName}</p>
              </div>
            </div>
            <ApplicationPriorityBadge priority={displayApp.priority} />
          </div>
          <DialogDescription className="sr-only">
            Application details and actions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label className="text-muted-foreground text-xs uppercase">Status</Label>
            {isEditing ? (
              <Select
                value={editedApp?.status}
                onValueChange={(v) =>
                  setEditedApp((prev) => (prev ? { ...prev, status: v as ApplicationStatus } : null))
                }
              >
                <SelectTrigger className="w-[180px]">
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
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <ApplicationStatusBadge status={displayApp.status} />
                <div className="flex gap-1 flex-wrap">
                  {(["draft", "in_review", "pending", "on_hold", "approved", "rejected"] as ApplicationStatus[])
                    .filter((s) => s !== displayApp.status)
                    .slice(0, 3)
                    .map((status) => (
                      <Button
                        key={status}
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleStatusChange(status)}
                      >
                        Move to {applicationStatusConfig[status].label}
                      </Button>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1">
                <DollarSign className="size-3" />
                Value
              </Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editedApp?.value ?? 0}
                  onChange={(e) =>
                    setEditedApp((prev) =>
                      prev ? { ...prev, value: parseFloat(e.target.value) || 0 } : null
                    )
                  }
                />
              ) : (
                <p className="text-lg font-semibold">{formatCurrency(displayApp.value)}</p>
              )}
            </div>

            {displayApp.workflowName && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1">
                  <Workflow className="size-3" />
                  Workflow
                </Label>
                <Badge variant="outline">{displayApp.workflowName}</Badge>
              </div>
            )}
          </div>

          {displayApp.progress !== undefined && displayApp.taskCount !== undefined && displayApp.taskCount > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                Progress
              </Label>
              <div className="space-y-1">
                <Progress value={displayApp.progress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {displayApp.completedTaskCount ?? 0} of {displayApp.taskCount} tasks completed
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label className="text-muted-foreground text-xs uppercase">Notes</Label>
            {isEditing ? (
              <Textarea
                value={editedApp?.notes ?? ""}
                onChange={(e) =>
                  setEditedApp((prev) => (prev ? { ...prev, notes: e.target.value || undefined } : null))
                }
                placeholder="Add notes..."
                rows={3}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {displayApp.notes || "No notes provided."}
              </p>
            )}
          </div>

          <div className="text-xs text-muted-foreground pt-2 border-t">
            Submitted {format(new Date(displayApp.submittedAt), "MMM d, yyyy")} &bull; Updated{" "}
            {format(new Date(displayApp.updatedAt), "MMM d, yyyy")}
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
                <AlertDialogTitle>Delete Application</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{application.title}&quot;? This action cannot be
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
              <Button variant="outline" onClick={handleEdit}>
                Edit Application
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
