"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Check, Eye, Trash2, X } from "lucide-react"
import { format, parseISO } from "date-fns"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { TaskStatusBadge, TaskPriorityBadge } from "@/components/common/status-badge"
import { taskStatusOptions } from "@/lib/status-config"
import type { Task, TaskStatus } from "@/types"

export { taskStatusOptions }

export interface TaskColumnActions {
  onOpenTask?: (task: Task) => void
  onDeleteTask?: (task: Task) => void
  onStatusChange?: (task: Task, status: TaskStatus) => void
  onReviewApprovalTask?: (task: Task) => void
}

export function createTaskColumns(actions?: TaskColumnActions): ColumnDef<Task>[] {
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
        onClick={(event) => event.stopPropagation()}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(event) => event.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: "Task",
    cell: ({ row }) => {
      const task = row.original
      return (
        <div>
          <p className="font-medium">{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {task.description}
            </p>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const task = row.original
      return (
        <TaskStatusBadge
          status={task.status}
          taskType={task.taskType}
          outcome={task.outcome ?? null}
        />
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "priority",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Priority
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const priority = row.getValue("priority") as Task["priority"]
      return <TaskPriorityBadge priority={priority} />
    },
  },
  {
    accessorKey: "assignedTo",
    header: "Assigned To",
    cell: ({ row }) => {
      const task = row.original
      if (task.assignedTo) {
        return <span>{task.assignedToName || task.assignedTo}</span>
      }
      if (task.assignedRole) {
        return (
          <Badge variant="outline" className="text-xs">
            {task.assignedRole}
          </Badge>
        )
      }
      return <span className="text-muted-foreground">Unassigned</span>
    },
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Due Date
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = row.getValue("dueDate") as string | undefined
      return date ? (
        <span className="text-muted-foreground">{format(parseISO(date), "MMM d, yyyy")}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.getValue("dueDate") as string | undefined
      const b = rowB.getValue("dueDate") as string | undefined
      if (!a && !b) return 0
      if (!a) return 1
      if (!b) return -1
      return a.localeCompare(b)
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const task = row.original
      const statusTargets: TaskStatus[] = ["backlog", "todo", "in_progress", "done"]
      const statusActions = statusTargets.filter((status) => status !== task.status)
      const isApprovalTask = task.taskType === "approval"
      const isDecisionPending = isApprovalTask && !task.outcome

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
            <Button variant="ghost" className="size-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation()
                actions?.onOpenTask?.(task)
              }}
            >
              <Eye className="mr-2 size-4" />
              Open task
            </DropdownMenuItem>

            {isApprovalTask ? (
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation()
                  const handler = actions?.onReviewApprovalTask ?? actions?.onOpenTask
                  handler?.(task)
                }}
                disabled={!isDecisionPending}
              >
                {isDecisionPending ? (
                  <>
                    <Check className="mr-2 size-4" />
                    Review decision
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 size-4" />
                    Decision submitted
                  </>
                )}
              </DropdownMenuItem>
            ) : (
              statusActions.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={(event) => {
                    event.stopPropagation()
                    actions?.onStatusChange?.(task, status)
                  }}
                >
                  {status === "done" ? (
                    <Check className="mr-2 size-4" />
                  ) : (
                    <X className="mr-2 size-4" />
                  )}
                  Move to {taskStatusOptions.find((option) => option.value === status)?.label ?? status}
                </DropdownMenuItem>
              ))
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation()
                actions?.onDeleteTask?.(task)
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              Delete task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
}

export const taskColumns = createTaskColumns()
