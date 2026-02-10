"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Eye, Trash2, ArrowUpDown, RotateCcw } from "lucide-react"
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
import { workflowExecutionStateConfig, workflowStatusOptions } from "@/lib/status-config"
import type { WorkflowExecution } from "@/types"

export { workflowStatusOptions }

export interface WorkflowColumnActions {
  onViewDetails?: (workflow: WorkflowExecution) => void
  onRerun?: (workflow: WorkflowExecution) => void
  onDelete?: (workflow: WorkflowExecution) => void
  rerunningWorkflowId?: string | null
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
      accessorKey: "id",
      header: "Execution",
      cell: ({ row }) => {
        const workflow = row.original
        return (
          <p className="font-mono text-xs">{workflow.id}</p>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "definitionName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Workflow
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const workflow = row.original
        return (
          <span className="font-medium">
            {workflow.definitionName ?? "Manual"}
          </span>
        )
      },
      sortingFn: (rowA, rowB, columnId) => {
        const a = (rowA.getValue(columnId) as string | undefined) ?? "Manual"
        const b = (rowB.getValue(columnId) as string | undefined) ?? "Manual"
        return a.localeCompare(b)
      },
    },
    {
      accessorKey: "contactName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Contact
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const workflow = row.original
        const displayName = workflow.contactName ?? "Unknown Contact"
        const initials = displayName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()

        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarImage src={workflow.contactAvatarUrl} alt={displayName} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{displayName}</span>
          </div>
        )
      },
      sortingFn: (rowA, rowB, columnId) => {
        const a = (rowA.getValue(columnId) as string | undefined) ?? ""
        const b = (rowB.getValue(columnId) as string | undefined) ?? ""
        return a.localeCompare(b)
      },
    },
    {
      accessorKey: "startedAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Started
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue("startedAt") as string
        return (
          <span className="text-muted-foreground">
            {format(new Date(date), "MMM d, yyyy")}
          </span>
        )
      },
      sortingFn: (rowA, rowB, columnId) => {
        const a = new Date((rowA.getValue(columnId) as string) ?? "").getTime()
        const b = new Date((rowB.getValue(columnId) as string) ?? "").getTime()
        return a - b
      },
    },
    {
      accessorKey: "workflowExecutionState",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          State
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const state = row.getValue("workflowExecutionState") as string | undefined
        if (!state) return <span className="text-muted-foreground">—</span>

        const config = workflowExecutionStateConfig[
          state as keyof typeof workflowExecutionStateConfig
        ]

        return (
          <Badge variant={config?.variant ?? "outline"}>
            {config?.label ?? state}
          </Badge>
        )
      },
      sortingFn: (rowA, rowB, columnId) => {
        const order: Record<string, number> = {
          running: 0,
          completed: 1,
          timeout: 2,
          cancelled: 3,
          error: 4,
        }
        const a = (rowA.getValue(columnId) as string | undefined) ?? ""
        const b = (rowB.getValue(columnId) as string | undefined) ?? ""
        return (order[a] ?? Number.MAX_SAFE_INTEGER) - (order[b] ?? Number.MAX_SAFE_INTEGER)
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const workflow = row.original
        return (
          <WorkflowStatusBadge
            status={workflow.status}
            definitionStatuses={workflow.definitionStatuses}
          />
        )
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
      id: "actions",
      cell: ({ row }) => {
        const workflow = row.original
        const isRerunning = actions?.rerunningWorkflowId === workflow.id
        const canRerun = Boolean(workflow.workflowDefinitionId && workflow.contactId)

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
                  actions?.onViewDetails?.(workflow)
                }}
              >
                <Eye className="mr-2 size-4" />
                View details
              </DropdownMenuItem>
              {canRerun && (
                <DropdownMenuItem
                  disabled={isRerunning}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!isRerunning) {
                      actions?.onRerun?.(workflow)
                    }
                  }}
                >
                  <RotateCcw className="mr-2 size-4" />
                  {isRerunning ? "Starting..." : "Re-Run"}
                </DropdownMenuItem>
              )}
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
