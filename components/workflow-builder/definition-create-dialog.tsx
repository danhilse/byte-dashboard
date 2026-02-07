"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FormDialog } from "@/components/common/form-dialog"

interface DefinitionCreateDialogProps {
  onCreate: (data: { name: string; description: string }) => void
}

export function DefinitionCreateDialog({
  onCreate,
}: DefinitionCreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const resetForm = () => {
    setName("")
    setDescription("")
  }

  const handleSubmit = () => {
    onCreate({ name: name.trim(), description: description.trim() })
    resetForm()
    setOpen(false)
  }

  return (
    <FormDialog
      title="New Blueprint"
      description="Create a new workflow blueprint."
      trigger={
        <Button>
          <Plus className="mr-2 size-4" />
          New Blueprint
        </Button>
      }
      open={open}
      onOpenChange={setOpen}
      onSubmit={handleSubmit}
      onCancel={resetForm}
      submitLabel="Create Blueprint"
      submitDisabled={!name.trim()}
    >
      <div className="grid gap-2">
        <Label htmlFor="def-name">Name</Label>
        <Input
          id="def-name"
          placeholder="e.g. Applicant Onboarding"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="def-description">Description (optional)</Label>
        <Textarea
          id="def-description"
          placeholder="Describe what this workflow does..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
    </FormDialog>
  )
}
