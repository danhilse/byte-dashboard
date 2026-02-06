"use client"

import { useState, type ReactNode } from "react"
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

interface FormDialogProps {
  // Dialog props
  title: string
  description: string
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void

  // Form props
  children: ReactNode
  onSubmit: (e: React.FormEvent) => void
  onCancel?: () => void

  // Footer props
  submitLabel?: string
  submitDisabled?: boolean
  cancelLabel?: string
  maxWidth?: "sm" | "md" | "lg" | "xl"
}

const maxWidthClasses = {
  sm: "sm:max-w-[500px]",
  md: "sm:max-w-[600px]",
  lg: "sm:max-w-[700px]",
  xl: "sm:max-w-[800px]",
}

export function FormDialog({
  title,
  description,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  children,
  onSubmit,
  onCancel,
  submitLabel = "Submit",
  submitDisabled = false,
  cancelLabel = "Cancel",
  maxWidth = "sm",
}: FormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen

  const handleCancel = () => {
    onCancel?.()
    setOpen(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(e)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={`${maxWidthClasses[maxWidth]} max-h-[90vh] overflow-y-auto`}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {children}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={submitDisabled}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
