"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { format } from "date-fns"

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
import type { Task } from "@/types"

const statusVariants: Record<Task["status"], "default" | "secondary" | "outline"> = {
  backlog: "outline",
  todo: "secondary",
  in_progress: "default",
  done: "default",
}

const statusLabels: Record<Task["status"], string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
}

const priorityVariants: Record<Task["priority"], "default" | "secondary" | "outline" | "destructive"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
}

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
      const status = row.getValue("status") as Task["status"]
      return (
        <Badge variant={statusVariants[status]}>
          {statusLabels[status]}
        </Badge>
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
      return (
        <Badge variant={priorityVariants[priority]}>
          {priority.charAt(0).toUpperCase() + priority.slice(1)}
        </Badge>
      )
    },
  },
  {
    accessorKey: "assignee",
    header: "Assignee",
    cell: ({ row }) => {
      const assignee = row.getValue("assignee") as string | undefined
      return assignee ? (
        <span>{assignee}</span>
      ) : (
        <span className="text-muted-foreground">Unassigned</span>
      )
    },
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => {
      const date = row.getValue("dueDate") as string | undefined
      return date ? (
        <span className="text-muted-foreground">{format(new Date(date), "MMM d, yyyy")}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const task = row.original

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

export const taskStatusOptions = [
  { label: "Backlog", value: "backlog" },
  { label: "To Do", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Done", value: "done" },
]
