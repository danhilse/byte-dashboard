"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Eye, Trash2 } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { WorkflowStatusBadge } from "@/components/common/status-badge"
import { workflowStatusOptions } from "@/lib/status-config"
import type { WorkflowExecution } from "@/types"

export { workflowStatusOptions }

export interface WorkflowColumnActions {
  onViewDetails?: (workflow: WorkflowExecution) => void
  onDelete?: (workflow: WorkflowExecution) => void
}

export function createWorkflowColumns(
  actions?: WorkflowColumnActions
): ColumnDef<WorkflowExecution>[] {
  return [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "contactName",
    header: "Contact",
    cell: ({ row }) => {
      const workflow = row.original
      const initials = (workflow.contactName ?? "")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()

      return (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarImage src={workflow.contactAvatarUrl} alt={workflow.contactName} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{workflow.contactName}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "definitionName",
    header: "Workflow",
    cell: ({ row }) => {
      const workflow = row.original
      return (
        <span className="font-medium">
          {workflow.definitionName ?? "Manual"}
        </span>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const workflow = row.original
      return <WorkflowStatusBadge status={workflow.status} definitionStatuses={workflow.definitionStatuses} />
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => {
      const source = row.getValue("source") as string
      const labels: Record<string, string> = {
        manual: "Manual",
        formstack: "Formstack",
        api: "API",
      }
      return <Badge variant="secondary">{labels[source] ?? source}</Badge>
    },
  },
  {
    accessorKey: "startedAt",
    header: "Started",
    cell: ({ row }) => {
      const date = row.getValue("startedAt") as string
      return <span className="text-muted-foreground">{format(new Date(date), "MMM d, yyyy")}</span>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const workflow = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="size-8 p-0" onClick={(e) => e.stopPropagation()}>
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
                actions?.onViewDetails?.(workflow)
              }}
            >
              <Eye className="mr-2 size-4" />
              View details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                actions?.onDelete?.(workflow)
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              Delete execution
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
  ]
}

export const workflowColumns = createWorkflowColumns()
