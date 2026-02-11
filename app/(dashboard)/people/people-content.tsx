"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState, useMemo, useEffect } from "react"
import { List, LayoutGrid, Trash2, FileText, Loader2, Upload } from "lucide-react"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { DataTableColumnToggle } from "@/components/data-table/data-table-column-toggle"
import { DataTableBulkActions } from "@/components/data-table/data-table-bulk-actions"
import { ViewToggle, type ViewOption } from "@/components/common/view-toggle"
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog"
import { ContactDeleteDialog } from "@/components/contacts/contact-delete-dialog"
import { AnimatedContactCard } from "@/components/contacts/animated-contact-card"
import { AnimatedTableRow } from "@/components/common/animated-table-row"
import { AnimatedHeader } from "@/components/common/animated-header"
import { AnimatedButtonGroup } from "@/components/dashboard/animated-button-group"
import { ContactFiltersDialog, type ContactFilters } from "@/components/contacts/contact-filters-dialog"
import { createContactColumns } from "@/components/data-table/columns/contact-columns"
import type { Contact } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { usePersistedView } from "@/hooks/use-persisted-view"

type ViewType = "table" | "card"

const viewOptions: ViewOption[] = [
  { id: "table", label: "Table", icon: List },
  { id: "card", label: "Card", icon: LayoutGrid },
]

const defaultAdvancedFilters: ContactFilters = {
  statuses: [],
  tags: [],
  createdAfter: "",
  createdBefore: "",
}

export function PeopleContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [view, setView] = usePersistedView<ViewType>("people", "table")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [advancedFilters, setAdvancedFilters] = useState<ContactFilters>(defaultAdvancedFilters)

  // Dialog states
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Table states
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Fetch contacts from API
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/contacts")

        if (!response.ok) {
          throw new Error("Failed to fetch contacts")
        }

        const data = await response.json()
        setContacts(data.contacts || [])
      } catch (error) {
        console.error("Error fetching contacts:", error)
        toast({
          title: "Error",
          description: "Failed to load contacts. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchContacts()
  }, [toast])


  const filteredContacts = useMemo(() => {
    let result = contacts

    // Apply advanced filters
    if (advancedFilters.statuses.length > 0) {
      result = result.filter((contact) => advancedFilters.statuses.includes(contact.status))
    }

    if (advancedFilters.tags.length > 0) {
      result = result.filter((contact) =>
        advancedFilters.tags.some((tag) =>
          contact.tags?.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
        )
      )
    }

    if (advancedFilters.createdAfter) {
      const afterDate = new Date(advancedFilters.createdAfter)
      result = result.filter((contact) => new Date(contact.createdAt) >= afterDate)
    }

    if (advancedFilters.createdBefore) {
      const beforeDate = new Date(advancedFilters.createdBefore)
      result = result.filter((contact) => new Date(contact.createdAt) <= beforeDate)
    }

    return result
  }, [contacts, advancedFilters])

  // Column actions handlers
  const handleEdit = useCallback((contact: Contact) => {
    setEditingContact(contact)
    setEditDialogOpen(true)
  }, [])

  const handleDelete = useCallback((contact: Contact) => {
    setDeletingContact(contact)
    setDeleteDialogOpen(true)
  }, [])

  const handleCreateWorkflow = useCallback((contact: Contact) => {
    router.push(`/workflows?contactId=${contact.id}`)
  }, [router])

  const columns = useMemo(
    () =>
      createContactColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        onCreateWorkflow: handleCreateWorkflow,
      }),
    [handleEdit, handleDelete, handleCreateWorkflow]
  )

  const table = useReactTable({
    data: filteredContacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  // CRUD operations
  const handleCreateContact = async (contactData: Omit<Contact, "id" | "createdAt">) => {
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactData),
      })

      if (!response.ok) {
        throw new Error("Failed to create contact")
      }

      const { contact } = await response.json()
      setContacts((prev) => [contact, ...prev])

      toast({
        title: "Success",
        description: "Contact created successfully",
      })
    } catch (error) {
      console.error("Error creating contact:", error)
      toast({
        title: "Error",
        description: "Failed to create contact. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateContact = async (updatedContact: Contact) => {
    try {
      const response = await fetch(`/api/contacts/${updatedContact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedContact),
      })

      if (!response.ok) {
        throw new Error("Failed to update contact")
      }

      const { contact } = await response.json()
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? contact : c))
      )
      setEditDialogOpen(false)
      setEditingContact(null)

      toast({
        title: "Success",
        description: "Contact updated successfully",
      })
    } catch (error) {
      console.error("Error updating contact:", error)
      toast({
        title: "Error",
        description: "Failed to update contact. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingContact) return

    try {
      const response = await fetch(`/api/contacts/${deletingContact.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete contact")
      }

      setContacts((prev) => prev.filter((c) => c.id !== deletingContact.id))
      setDeleteDialogOpen(false)
      setDeletingContact(null)

      toast({
        title: "Success",
        description: "Contact deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting contact:", error)
      toast({
        title: "Error",
        description: "Failed to delete contact. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Bulk operations
  const handleBulkDelete = async () => {
    const selectedContacts = table.getSelectedRowModel().rows.map((row) => row.original)
    const selectedIds = selectedContacts.map((c) => c.id)

    try {
      const results = await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/contacts/${id}`, { method: "DELETE" }).then((response) => ({
            id,
            ok: response.ok,
          }))
        )
      )

      const deletedIds = results.filter((r) => r.ok).map((r) => r.id)
      const failedCount = results.length - deletedIds.length

      setContacts((prev) => prev.filter((c) => !deletedIds.includes(c.id)))
      table.resetRowSelection()

      if (deletedIds.length > 0) {
        toast({
          title: failedCount > 0 ? "Partial success" : "Success",
          description:
            failedCount > 0
              ? `Deleted ${deletedIds.length} contact(s). ${failedCount} failed.`
              : `Deleted ${deletedIds.length} contact(s) successfully`,
          variant: failedCount > 0 ? "destructive" : "default",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete selected contacts.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting contacts:", error)
      toast({
        title: "Error",
        description: "Failed to delete some contacts. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleBulkCreateWorkflows = () => {
    const selectedContacts = table.getSelectedRowModel().rows.map((row) => row.original)
    alert(`Creating workflows for ${selectedContacts.length} contacts`)
    table.resetRowSelection()
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading contacts...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <AnimatedHeader delay={0}>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">People</h1>
            <p className="text-sm text-muted-foreground">
              Manage your contacts and their information.
            </p>
          </div>
        </AnimatedHeader>
        <div className="flex items-center gap-2">
          <AnimatedButtonGroup delay={0.1}>
            <Button variant="outline" disabled title="Coming soon">
              <Upload className="size-4" />
              Import from CSV
            </Button>
          </AnimatedButtonGroup>
          <AnimatedButtonGroup delay={0.2}>
            <ContactFormDialog mode="create" onSubmit={handleCreateContact} />
          </AnimatedButtonGroup>
        </div>
      </div>

      {/* Table controls */}
      <AnimatedHeader delay={0.15}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ContactFiltersDialog
              filters={advancedFilters}
              onApply={setAdvancedFilters}
            />
            {view === "table" && <DataTableColumnToggle table={table} />}
            <DataTableToolbar
              table={table}
              searchKey="firstName"
              searchPlaceholder="Search contacts..."
            />
          </div>
          <ViewToggle views={viewOptions} value={view} onChange={setView as (value: string) => void} />
        </div>
      </AnimatedHeader>

      {/* Content */}
      <div className="relative flex-1">
        {view === "table" && (
          <div className="space-y-4">
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row, index) => (
                      <AnimatedTableRow
                        key={row.id}
                        dataState={row.getIsSelected() ? "selected" : undefined}
                        className="table-row-optimized"
                        delay={index * 0.03}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </AnimatedTableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DataTablePagination table={table} />
          </div>
        )}

        {view === "card" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredContacts.map((contact, index) => (
              <AnimatedContactCard
                key={contact.id}
                contact={contact}
                onEdit={handleEdit}
                onDelete={handleDelete}
                delay={index * 0.05}
              />
            ))}
            {filteredContacts.length === 0 && (
              <div className="col-span-full flex h-40 items-center justify-center text-muted-foreground">
                No contacts found
              </div>
            )}
          </div>
        )}

        {/* Bulk Actions Bar */}
        {view === "table" && (
          <DataTableBulkActions table={table}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkCreateWorkflows}
            >
              <FileText className="mr-2 size-4" />
              Create Workflows
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          </DataTableBulkActions>
        )}
      </div>

      {/* Edit Dialog */}
      <ContactFormDialog
        mode="edit"
        contact={editingContact ?? undefined}
        onSubmit={(data) => handleUpdateContact(data as Contact)}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        trigger={null}
      />

      {/* Delete Confirmation Dialog */}
      <ContactDeleteDialog
        contact={deletingContact}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
