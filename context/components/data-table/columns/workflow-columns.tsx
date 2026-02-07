'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react'
import { Workflow } from '@/types'
import { workflowStatusConfig, taskPriorityConfig } from '@/lib/status-config'

interface WorkflowColumnActions {
  onEdit?: (workflow: Workflow) => void
  onDelete?: (workflow: Workflow) => void
  onView?: (workflow: Workflow) => void
}

export function createWorkflowColumns(actions?: WorkflowColumnActions): ColumnDef<Workflow>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
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
      accessorKey: 'contactName',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Contact
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const contactName = row.getValue('contactName') as string
        const avatarUrl = row.original.contactAvatarUrl

        return (
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt={contactName} className="size-8 rounded-full object-cover" />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {contactName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
            )}
            <span className="font-medium">{contactName}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Status
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const config = workflowStatusConfig[status as keyof typeof workflowStatusConfig]

        return config ? (
          <Badge variant={config.variant}>{config.label}</Badge>
        ) : (
          <Badge>{status}</Badge>
        )
      },
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => {
        const priority = row.getValue('priority') as string
        const config = taskPriorityConfig[priority as keyof typeof taskPriorityConfig]

        return config ? (
          <Badge variant={config.variant}>{config.label}</Badge>
        ) : (
          <Badge variant="outline">{priority}</Badge>
        )
      },
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => {
        const source = row.getValue('source') as string | undefined
        return (
          <span className="text-sm capitalize text-muted-foreground">{source || 'manual'}</span>
        )
      },
    },
    {
      accessorKey: 'submittedAt',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Submitted
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue('submittedAt'))
        return <span className="text-sm">{date.toLocaleDateString()}</span>
      },
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => {
        const date = new Date(row.getValue('updatedAt'))
        return <span className="text-sm text-muted-foreground">{date.toLocaleDateString()}</span>
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const workflow = row.original

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
              <DropdownMenuSeparator />
              {actions?.onView && (
                <DropdownMenuItem onClick={() => actions.onView?.(workflow)}>
                  <Eye className="mr-2 size-4" />
                  View Details
                </DropdownMenuItem>
              )}
              {actions?.onEdit && (
                <DropdownMenuItem onClick={() => actions.onEdit?.(workflow)}>
                  <Pencil className="mr-2 size-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {actions?.onDelete && (
                <DropdownMenuItem
                  onClick={() => actions.onDelete?.(workflow)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}

export const workflowStatusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'In Review', value: 'in_review' },
  { label: 'Pending', value: 'pending' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]
