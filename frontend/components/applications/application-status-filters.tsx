"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { applicationStatusConfig } from "@/lib/status-config"
import type { ApplicationStatus } from "@/types"

interface ApplicationStatusFiltersProps {
  selectedStatuses: ApplicationStatus[]
  onStatusChange: (statuses: ApplicationStatus[]) => void
}

const allStatuses: ApplicationStatus[] = ["draft", "in_review", "pending", "on_hold", "approved", "rejected"]

export function ApplicationStatusFilters({ selectedStatuses, onStatusChange }: ApplicationStatusFiltersProps) {
  const toggleStatus = (status: ApplicationStatus) => {
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
        const config = applicationStatusConfig[status]
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
