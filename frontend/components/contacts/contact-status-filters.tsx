"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { contactStatusConfig } from "@/lib/status-config"
import type { ContactStatus } from "@/types"

interface ContactStatusFiltersProps {
  selectedStatuses: ContactStatus[]
  onStatusChange: (statuses: ContactStatus[]) => void
}

const allStatuses: ContactStatus[] = ["active", "inactive", "lead"]

export function ContactStatusFilters({ selectedStatuses, onStatusChange }: ContactStatusFiltersProps) {
  const toggleStatus = (status: ContactStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter((s) => s !== status))
    } else {
      onStatusChange([...selectedStatuses, status])
    }
  }

  const clearAll = () => {
    onStatusChange([])
  }

  const hasFilters = selectedStatuses.length > 0

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {allStatuses.map((status) => {
        const config = contactStatusConfig[status]
        const isSelected = selectedStatuses.includes(status)

        return (
          <Badge
            key={status}
            variant={isSelected ? "default" : "outline"}
            className="cursor-pointer transition-colors hover:bg-accent"
            onClick={() => toggleStatus(status)}
          >
            {config.label}
          </Badge>
        )
      })}

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground"
          onClick={clearAll}
        >
          <X className="mr-1 size-3" />
          Clear
        </Button>
      )}
    </div>
  )
}
