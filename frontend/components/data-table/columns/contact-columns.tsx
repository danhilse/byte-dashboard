"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Eye, Pencil, Trash2, FileText } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ContactStatusBadge } from "@/components/common"
import { getInitials } from "@/lib/utils"
import { contactStatusOptions } from "@/lib/status-config"
import type { Contact } from "@/types"

export { contactStatusOptions }

export interface ContactColumnActions {
  onEdit?: (contact: Contact) => void
  onDelete?: (contact: Contact) => void
  onCreateApplication?: (contact: Contact) => void
}

export function createContactColumns(actions?: ContactColumnActions): ColumnDef<Contact>[] {
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
          onClick={(e) => e.stopPropagation()}
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
      accessorKey: "firstName",
      header: "Name",
      cell: ({ row }) => {
        const contact = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">
                {getInitials(`${contact.firstName} ${contact.lastName}`)}
              </AvatarFallback>
            </Avatar>
            <div>
              <Link
                href={`/people/${contact.id}`}
                className="font-medium hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {contact.firstName} {contact.lastName}
              </Link>
              <p className="text-xs text-muted-foreground">{contact.email}</p>
            </div>
          </div>
        )
      },
      enableHiding: false,
    },
    {
      accessorKey: "company",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Company
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const contact = row.original
        return (
          <div>
            <p className="font-medium">{contact.company}</p>
            <p className="text-xs text-muted-foreground">{contact.role}</p>
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as Contact["status"]
        return <ContactStatusBadge status={status} />
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      enableHiding: true,
    },
    {
      id: "location",
      header: "Location",
      accessorFn: (row) => {
        if (!row.address) return ""
        return [row.address.city, row.address.state].filter(Boolean).join(", ")
      },
      cell: ({ row }) => {
        const contact = row.original
        if (!contact.address) return <span className="text-muted-foreground">-</span>
        const location = [contact.address.city, contact.address.state].filter(Boolean).join(", ")
        return location || <span className="text-muted-foreground">-</span>
      },
      enableHiding: true,
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.original.tags
        if (!tags || tags.length === 0) {
          return <span className="text-muted-foreground">-</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 2}
              </Badge>
            )}
          </div>
        )
      },
      enableHiding: true,
    },
    {
      accessorKey: "applicationsCount",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Workflows
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const count = row.original.workflowsCount ?? 0
        return <span className="text-center">{count}</span>
      },
      enableHiding: true,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Created
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt)
        return <span>{date.toLocaleDateString()}</span>
      },
      enableHiding: true,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const contact = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" className="size-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  navigator.clipboard.writeText(contact.email)
                }}
              >
                Copy email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/people/${contact.id}`} onClick={(e) => e.stopPropagation()}>
                  <Eye className="mr-2 size-4" />
                  View details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  actions?.onEdit?.(contact)
                }}
              >
                <Pencil className="mr-2 size-4" />
                Edit contact
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  actions?.onCreateApplication?.(contact)
                }}
              >
                <FileText className="mr-2 size-4" />
                Create application
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  actions?.onDelete?.(contact)
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}

// Default columns without actions for backwards compatibility
export const contactColumns = createContactColumns()
