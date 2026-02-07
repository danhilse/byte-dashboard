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
import type { Contact } from "@/types"

interface ContactDeleteDialogProps {
  contact: Contact | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ContactDeleteDialog({
  contact,
  open,
  onOpenChange,
  onConfirm,
}: ContactDeleteDialogProps) {
  if (!contact) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Contact</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              {contact.firstName} {contact.lastName}
            </span>
            ? This action cannot be undone.
          </AlertDialogDescription>
          <AlertDialogDescription className="mt-2 text-destructive">
            Warning: Any workflows associated with this contact will also be affected.
          </AlertDialogDescription>
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
