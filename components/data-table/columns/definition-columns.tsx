"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { WorkflowDefinition } from "@/types"

export function createDefinitionColumns(opts: {
  onEdit: (definition: WorkflowDefinition) => void
  onDelete: (definition: WorkflowDefinition) => void
}): ColumnDef<WorkflowDefinition>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const def = row.original
        return (
          <div>
            <span className="font-medium">{def.name}</span>
            {def.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {def.description}
              </p>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "version",
      header: "Version",
      cell: ({ row }) => (
        <Badge variant="secondary">v{row.getValue("version")}</Badge>
      ),
    },
    {
      id: "steps",
      header: "Steps",
      cell: ({ row }) => {
        const def = row.original
        const count = Array.isArray(def.steps) ? def.steps.length : 0
        return (
          <span className="text-muted-foreground">
            {count} {count === 1 ? "step" : "steps"}
          </span>
        )
      },
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => {
        const date = row.getValue("updatedAt") as string
        return (
          <span className="text-muted-foreground">
            {format(new Date(date), "MMM d, yyyy")}
          </span>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const def = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="size-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  opts.onEdit(def)
                }}
              >
                Edit blueprint
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  opts.onDelete(def)
                }}
              >
                Delete blueprint
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
