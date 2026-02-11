"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
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
import type { Task } from "@/types"

export { taskStatusOptions }

export const taskColumns: ColumnDef<Task>[] = [
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
    cell: () => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="size-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>Edit task</DropdownMenuItem>
            <DropdownMenuItem>Change status</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Delete task</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
