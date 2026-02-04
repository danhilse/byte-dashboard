"use client"

import { Button } from "@/components/ui/button"
import type { LucideIcon } from "lucide-react"

export interface ViewOption {
  id: string
  label: string
  icon: LucideIcon
}

interface ViewToggleProps {
  views: ViewOption[]
  value: string
  onChange: (value: string) => void
}

export function ViewToggle({ views, value, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border p-1">
      {views.map((view) => {
        const Icon = view.icon
        return (
          <Button
            key={view.id}
            variant={value === view.id ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onChange(view.id)}
          >
            <Icon className="mr-2 size-4" />
            {view.label}
          </Button>
        )
      })}
    </div>
  )
}
