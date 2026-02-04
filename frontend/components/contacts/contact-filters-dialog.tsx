"use client"

import { useState } from "react"
import { Filter } from "lucide-react"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { contactStatusConfig } from "@/lib/status-config"
import type { ContactStatus } from "@/types"

export interface ContactFilters {
  statuses: ContactStatus[]
  tags: string[]
  createdAfter: string
  createdBefore: string
}

interface ContactFiltersDialogProps {
  filters: ContactFilters
  onApply: (filters: ContactFilters) => void
  trigger?: React.ReactNode
}

const defaultFilters: ContactFilters = {
  statuses: [],
  tags: [],
  createdAfter: "",
  createdBefore: "",
}

const allStatuses: ContactStatus[] = ["active", "inactive", "lead"]

export function ContactFiltersDialog({
  filters,
  onApply,
  trigger,
}: ContactFiltersDialogProps) {
  const [open, setOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<ContactFilters>(filters)
  const [tagsInput, setTagsInput] = useState(filters.tags.join(", "))

  const handleOpen = (newOpen: boolean) => {
    if (newOpen) {
      setLocalFilters(filters)
      setTagsInput(filters.tags.join(", "))
    }
    setOpen(newOpen)
  }

  const toggleStatus = (status: ContactStatus) => {
    setLocalFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }))
  }

  const handleApply = () => {
    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    onApply({ ...localFilters, tags: parsedTags })
    setOpen(false)
  }

  const handleReset = () => {
    setLocalFilters(defaultFilters)
    setTagsInput("")
  }

  const hasActiveFilters =
    localFilters.statuses.length > 0 ||
    tagsInput.trim() !== "" ||
    localFilters.createdAfter !== "" ||
    localFilters.createdBefore !== ""

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Filter className="mr-2 size-4" />
            Filters
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Filter Contacts</DialogTitle>
          <DialogDescription>
            Apply filters to narrow down your contact list.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-3">
            <Label>Status</Label>
            <div className="flex flex-wrap gap-4">
              {allStatuses.map((status) => {
                const config = contactStatusConfig[status]
                return (
                  <div key={status} className="flex items-center gap-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={localFilters.statuses.includes(status)}
                      onCheckedChange={() => toggleStatus(status)}
                    />
                    <Label
                      htmlFor={`status-${status}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {config.label}
                    </Label>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="vip, enterprise (comma-separated)"
            />
          </div>

          <div className="grid gap-3">
            <Label>Created Date Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="createdAfter" className="text-xs text-muted-foreground">
                  From
                </Label>
                <Input
                  id="createdAfter"
                  type="date"
                  value={localFilters.createdAfter}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      createdAfter: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="createdBefore" className="text-xs text-muted-foreground">
                  To
                </Label>
                <Input
                  id="createdBefore"
                  type="date"
                  value={localFilters.createdBefore}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      createdBefore: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            disabled={!hasActiveFilters}
          >
            Reset
          </Button>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApply}>
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
