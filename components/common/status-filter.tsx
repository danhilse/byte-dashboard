"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type BadgeVariant = "default" | "secondary" | "outline" | "destructive"

interface StatusFilterProps<T extends string> {
  allStatuses: readonly T[]
  statusConfig: Record<T, { label: string; variant: BadgeVariant }>
  selectedStatuses: T[]
  onStatusChange: (statuses: T[]) => void
}

export function StatusFilter<T extends string>({
  allStatuses,
  statusConfig,
  selectedStatuses,
  onStatusChange,
}: StatusFilterProps<T>) {
  const toggleStatus = (status: T) => {
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
        const config = statusConfig[status]
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
