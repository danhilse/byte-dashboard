"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import Link from "next/link"
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
import { ApplicationStatusBadge, ApplicationPriorityBadge } from "@/components/common"
import { formatCurrency } from "@/lib/utils"
import { applicationStatusOptions } from "@/lib/status-config"
import type { Application } from "@/types"

export { applicationStatusOptions }

export const applicationColumns: ColumnDef<Application>[] = [
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
    header: "Application",
    cell: ({ row }) => {
      const application = row.original
      return (
        <div>
          <Link
            href={`/applications/${application.id}`}
            className="font-medium hover:underline"
          >
            {application.title}
          </Link>
          <p className="text-xs text-muted-foreground">{application.contactName}</p>
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as Application["status"]
      return <ApplicationStatusBadge status={status} />
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const priority = row.getValue("priority") as Application["priority"]
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
      const application = row.original

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
            <DropdownMenuItem asChild>
              <Link href={`/applications/${application.id}`}>View details</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Edit application</DropdownMenuItem>
            <DropdownMenuItem>Change status</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

