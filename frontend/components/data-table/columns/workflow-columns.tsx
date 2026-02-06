"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ApplicationStatusBadge, ApplicationPriorityBadge } from "@/components/common"
import { formatCurrency } from "@/lib/utils"
import { workflowStatusOptions } from "@/lib/status-config"
import type { Workflow } from "@/types"

export { workflowStatusOptions }

export const workflowColumns: ColumnDef<Workflow>[] = [
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
      const initials = workflow.contactName
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
    accessorKey: "title",
    header: "Workflow",
    cell: ({ row }) => {
      const workflow = row.original
      return (
        <div>
          <span className="font-medium">{workflow.title}</span>
          {workflow.templateName && (
            <p className="text-xs text-muted-foreground">{workflow.templateName}</p>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as Workflow["status"]
      return <ApplicationStatusBadge status={status} />
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }) => {
      const workflow = row.original
      if (workflow.progress === undefined || !workflow.taskCount) {
        return <span className="text-muted-foreground text-sm">-</span>
      }
      return (
        <div className="w-[120px] space-y-1">
          <Progress value={workflow.progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            {workflow.completedTaskCount ?? 0}/{workflow.taskCount} tasks
          </p>
        </div>
      )
    },
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const priority = row.getValue("priority") as Workflow["priority"]
      return <ApplicationPriorityBadge priority={priority} />
    },
  },
  {
    accessorKey: "value",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Value
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const value = row.getValue("value") as number
      return <span className="font-medium">{formatCurrency(value)}</span>
    },
  },
  {
    accessorKey: "submittedAt",
    header: "Submitted",
    cell: ({ row }) => {
      const date = row.getValue("submittedAt") as string
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
            <DropdownMenuItem asChild>
              <Link href={`/workflows/${workflow.id}`}>View details</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Edit workflow</DropdownMenuItem>
            <DropdownMenuItem>Change status</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
