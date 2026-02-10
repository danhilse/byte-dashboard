"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { WorkflowExecution } from "@/types"

interface WorkflowDeleteDialogProps {
  workflow: WorkflowExecution | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function WorkflowDeleteDialog({
  workflow,
  open,
  onOpenChange,
  onConfirm,
}: WorkflowDeleteDialogProps) {
  if (!workflow) return null

  const displayName = workflow.definitionName
    ? `${workflow.definitionName} - ${workflow.contactName ?? "Unknown"}`
    : workflow.contactName ?? "this workflow"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the workflow for{" "}
            <span className="font-medium text-foreground">
              {displayName}
            </span>
            ? This action cannot be undone.
          </AlertDialogDescription>
          {workflow.temporalWorkflowId && (
            <AlertDialogDescription className="mt-2 text-destructive">
              Warning: This workflow is managed by Temporal. Deleting it will also terminate the Temporal execution.
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
