"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Trash2, Workflow as WorkflowIcon, DollarSign, CheckCircle2, FileText } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { AssetList, AssetUploader, AssetPreviewModal } from "@/components/assets"
import { workflowStatusConfig, workflowPriorityConfig } from "@/lib/status-config"
import { getAssetsByWorkflow } from "@/lib/data/assets"
import { formatCurrency } from "@/lib/utils"
import { useDetailDialogEdit } from "@/hooks/use-detail-dialog-edit"
import type { Workflow, WorkflowStatus, Asset } from "@/types"

interface WorkflowDetailDialogProps {
  workflow: Workflow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateWorkflow?: (workflow: Workflow) => void
  onDeleteWorkflow?: (workflowId: string) => void
}

export function WorkflowDetailDialog({
  workflow,
  open,
  onOpenChange,
  onUpdateWorkflow,
  onDeleteWorkflow,
}: WorkflowDetailDialogProps) {
  const {
    isEditing,
    editedItem: editedWorkflow,
    displayItem: displayWorkflow,
    handleEdit,
    handleSave,
    handleCancel,
    handleDelete,
    updateField,
    handleQuickStatusUpdate,
  } = useDetailDialogEdit({
    item: workflow,
    onUpdate: onUpdateWorkflow,
    onDelete: onDeleteWorkflow,
    onClose: () => onOpenChange(false),
  })

  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null)

  const handleAssetUpload = async (files: File[]) => {
    // Handle asset upload - in a real app, this would update the backend
    console.log("Assets uploaded:", files)
  }

  const handleAssetDelete = (assetId: string) => {
    // Handle asset deletion - in a real app, this would update the backend
    console.log("Asset deleted:", assetId)
  }

  if (!workflow || !displayWorkflow) return null
  const initials = displayWorkflow.contactName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  const workflowAssets = workflow ? getAssetsByWorkflow(workflow.id) : []

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarImage src={displayWorkflow.contactAvatarUrl} alt={displayWorkflow.contactName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  {isEditing ? (
                    <Input
                      value={editedWorkflow?.title ?? ""}
                      onChange={(e) => updateField("title", e.target.value)}
                      className="text-lg font-semibold"
                    />
                  ) : (
                    <DialogTitle className="text-lg">{displayWorkflow.title}</DialogTitle>
                  )}
                  <p className="text-sm text-muted-foreground">{displayWorkflow.contactName}</p>
                </div>
              </div>
              <ApplicationPriorityBadge priority={displayWorkflow.priority} />
            </div>
            <DialogDescription className="sr-only">
              Workflow details and actions
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="assets">Assets ({workflowAssets.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex-1 overflow-auto space-y-4 py-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground text-xs uppercase">Status</Label>
                {isEditing ? (
                  <Select
                    value={editedWorkflow?.status}
                    onValueChange={(v) => updateField("status", v as WorkflowStatus)}
                  >
                    <SelectTrigger className="w-[180px]">
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
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <ApplicationStatusBadge status={displayWorkflow.status} />
                    <div className="flex gap-1 flex-wrap">
                      {(["draft", "in_review", "pending", "on_hold", "approved", "rejected"] as WorkflowStatus[])
                        .filter((s) => s !== displayWorkflow.status)
                        .slice(0, 3)
                        .map((status) => (
                          <Button
                            key={status}
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleQuickStatusUpdate(status)}
                          >
                            Move to {workflowStatusConfig[status].label}
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
                      value={editedWorkflow?.value ?? 0}
                      onChange={(e) => updateField("value", parseFloat(e.target.value) || 0)}
                    />
                  ) : (
                    <p className="text-lg font-semibold">{formatCurrency(displayWorkflow.value)}</p>
                  )}
                </div>

                {displayWorkflow.templateName && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1">
                      <WorkflowIcon className="size-3" />
                      Template
                    </Label>
                    <Badge variant="outline">{displayWorkflow.templateName}</Badge>
                  </div>
                )}
              </div>

              {displayWorkflow.progress !== undefined && displayWorkflow.taskCount !== undefined && displayWorkflow.taskCount > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1">
                    <CheckCircle2 className="size-3" />
                    Progress
                  </Label>
                  <div className="space-y-1">
                    <Progress value={displayWorkflow.progress} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      {displayWorkflow.completedTaskCount ?? 0} of {displayWorkflow.taskCount} tasks completed
                    </p>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label className="text-muted-foreground text-xs uppercase">Notes</Label>
                {isEditing ? (
                  <Textarea
                    value={editedWorkflow?.notes ?? ""}
                    onChange={(e) => updateField("notes", e.target.value || undefined)}
                    placeholder="Add notes..."
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {displayWorkflow.notes || "No notes provided."}
                  </p>
                )}
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t">
                Submitted {format(new Date(displayWorkflow.submittedAt), "MMM d, yyyy")} &bull; Updated{" "}
                {format(new Date(displayWorkflow.updatedAt), "MMM d, yyyy")}
              </div>
            </TabsContent>

            <TabsContent value="assets" className="flex-1 overflow-auto space-y-4 py-4">
              <AssetUploader
                workflowId={workflow.id}
                onUpload={handleAssetUpload}
              />
              <AssetList
                assets={workflowAssets}
                onPreview={setPreviewAsset}
                onDelete={handleAssetDelete}
              />
            </TabsContent>
          </Tabs>

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
                  <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{workflow.title}&quot;? This action cannot be
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
                  Edit Workflow
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssetPreviewModal
        asset={previewAsset}
        open={!!previewAsset}
        onOpenChange={(open) => !open && setPreviewAsset(null)}
      />
    </>
  )
}
