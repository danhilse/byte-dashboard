"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Trash2, Workflow as WorkflowIcon, Calendar, Zap, Globe } from "lucide-react"

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
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { WorkflowStatusBadge } from "@/components/common/status-badge"
import { AssetList, AssetUploader, AssetPreviewModal } from "@/components/assets"
import { workflowStatusConfig } from "@/lib/status-config"
import { getAssetsByWorkflow } from "@/lib/data/assets"
import { useDetailDialogEdit } from "@/hooks/use-detail-dialog-edit"
import type { Workflow, WorkflowStatus, Asset } from "@/types"

const sourceLabels: Record<string, string> = {
  manual: "Manual",
  formstack: "Formstack",
  api: "API",
}

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
    console.log("Assets uploaded:", files)
  }

  const handleAssetDelete = (assetId: string) => {
    console.log("Asset deleted:", assetId)
  }

  if (!workflow || !displayWorkflow) return null

  const initials = (displayWorkflow.contactName ?? "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  const workflowAssets = workflow ? getAssetsByWorkflow(workflow.id) : []
  const displayName = displayWorkflow.definitionName
    ? `${displayWorkflow.definitionName} - ${displayWorkflow.contactName ?? "Unknown"}`
    : displayWorkflow.contactName ?? "Workflow"
  const isTemporalManaged = Boolean(displayWorkflow.temporalWorkflowId)

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
                  <DialogTitle className="text-lg">{displayName}</DialogTitle>
                  <p className="text-sm text-muted-foreground">{displayWorkflow.contactName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {displayWorkflow.temporalWorkflowId && (
                  <Badge variant="outline" className="gap-1">
                    <Zap className="size-3" />
                    Temporal
                  </Badge>
                )}
              </div>
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
                  isTemporalManaged ? (
                    <div className="flex items-center gap-2">
                      <WorkflowStatusBadge status={displayWorkflow.status} />
                      <Badge variant="secondary" className="text-xs">Temporal-managed</Badge>
                    </div>
                  ) : (
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
                  )
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <WorkflowStatusBadge status={displayWorkflow.status} />
                    {displayWorkflow.temporalWorkflowId && (
                      <Badge variant="secondary" className="text-xs">Temporal-managed</Badge>
                    )}
                    {!isTemporalManaged && (
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
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {displayWorkflow.definitionName && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1">
                      <WorkflowIcon className="size-3" />
                      Definition
                    </Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{displayWorkflow.definitionName}</Badge>
                      {displayWorkflow.definitionVersion && (
                        <span className="text-xs text-muted-foreground">v{displayWorkflow.definitionVersion}</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase flex items-center gap-1">
                    <Globe className="size-3" />
                    Source
                  </Label>
                  <Badge variant="secondary">
                    {sourceLabels[displayWorkflow.source] ?? displayWorkflow.source}
                  </Badge>
                </div>
              </div>

              {(displayWorkflow.currentStepId || displayWorkflow.currentPhaseId) && (
                <div className="grid grid-cols-2 gap-4">
                  {displayWorkflow.currentStepId && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs uppercase">Current Step</Label>
                      <p className="text-sm">{displayWorkflow.currentStepId}</p>
                    </div>
                  )}
                  {displayWorkflow.currentPhaseId && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs uppercase">Current Phase</Label>
                      <p className="text-sm">{displayWorkflow.currentPhaseId}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
                <div className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  Started {format(new Date(displayWorkflow.startedAt ?? displayWorkflow.createdAt), "MMM d, yyyy")}
                </div>
                {displayWorkflow.completedAt && (
                  <div>Completed {format(new Date(displayWorkflow.completedAt), "MMM d, yyyy")}</div>
                )}
                <div>Updated {format(new Date(displayWorkflow.updatedAt), "MMM d, yyyy")}</div>
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
                    Are you sure you want to delete this workflow for{" "}
                    <span className="font-medium text-foreground">{displayWorkflow.contactName}</span>?
                    This action cannot be undone.
                  </AlertDialogDescription>
                  {workflow.temporalWorkflowId && (
                    <AlertDialogDescription className="mt-2 text-destructive">
                      Warning: This workflow is managed by Temporal. The Temporal execution will not be affected.
                    </AlertDialogDescription>
                  )}
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
                <Button variant="outline" onClick={handleEdit} disabled={isTemporalManaged}>
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
