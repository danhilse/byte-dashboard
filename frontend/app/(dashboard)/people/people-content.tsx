"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useCallback, useState, useMemo } from "react"
import { List, LayoutGrid, Trash2, FileText } from "lucide-react"
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
import { StatusFilter } from "@/components/common/status-filter"
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog"
import { ContactDeleteDialog } from "@/components/contacts/contact-delete-dialog"
import { ContactCard } from "@/components/contacts/contact-card"
import { CSVImportDialog } from "@/components/contacts/csv-import-dialog"
import { ContactFiltersDialog, type ContactFilters } from "@/components/contacts/contact-filters-dialog"
import { createContactColumns, contactStatusOptions } from "@/components/data-table/columns/contact-columns"
import { allContactStatuses, contactStatusConfig } from "@/lib/status-config"
import { contacts as initialContacts } from "@/lib/data/contacts"
import type { Contact, ContactStatus } from "@/types"

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
  const searchParams = useSearchParams()
  const router = useRouter()

  const view = (searchParams.get("view") as ViewType) || "table"
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [selectedStatuses, setSelectedStatuses] = useState<ContactStatus[]>([])
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

  const updateView = useCallback(
    (newView: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("view", newView)
      router.push(`/people?${params.toString()}`)
    },
    [searchParams, router]
  )

  const filteredContacts = useMemo(() => {
    let result = contacts

    // Apply status filters (from badge toggles)
    if (selectedStatuses.length > 0) {
      result = result.filter((contact) => selectedStatuses.includes(contact.status))
    }

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
  }, [contacts, selectedStatuses, advancedFilters])

  // Column actions handlers
  const handleEdit = useCallback((contact: Contact) => {
    setEditingContact(contact)
    setEditDialogOpen(true)
  }, [])

  const handleDelete = useCallback((contact: Contact) => {
    setDeletingContact(contact)
    setDeleteDialogOpen(true)
  }, [])

  const handleCreateApplication = useCallback((contact: Contact) => {
    router.push(`/applications?contact=${contact.id}`)
  }, [router])

  const columns = useMemo(
    () =>
      createContactColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        onCreateApplication: handleCreateApplication,
      }),
    [handleEdit, handleDelete, handleCreateApplication]
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
  const handleCreateContact = (contactData: Omit<Contact, "id" | "createdAt">) => {
    const newContact: Contact = {
      ...contactData,
      id: `c${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    setContacts((prev) => [newContact, ...prev])
  }

  const handleUpdateContact = (updatedContact: Contact) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === updatedContact.id ? updatedContact : c))
    )
    setEditDialogOpen(false)
    setEditingContact(null)
  }

  const handleConfirmDelete = () => {
    if (deletingContact) {
      setContacts((prev) => prev.filter((c) => c.id !== deletingContact.id))
      setDeleteDialogOpen(false)
      setDeletingContact(null)
    }
  }

  const handleCSVImport = (importedContacts: Omit<Contact, "id" | "createdAt">[]) => {
    const newContacts: Contact[] = importedContacts.map((c, index) => ({
      ...c,
      id: `c${Date.now()}-${index}`,
      createdAt: new Date().toISOString(),
    }))
    setContacts((prev) => [...newContacts, ...prev])
  }

  // Bulk operations
  const handleBulkDelete = () => {
    const selectedIds = table.getSelectedRowModel().rows.map((row) => row.original.id)
    setContacts((prev) => prev.filter((c) => !selectedIds.includes(c.id)))
    table.resetRowSelection()
  }

  const handleBulkCreateApplications = () => {
    const selectedContacts = table.getSelectedRowModel().rows.map((row) => row.original)
    alert(`Creating applications for ${selectedContacts.length} contacts`)
    table.resetRowSelection()
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your contacts and their information.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CSVImportDialog onImport={handleCSVImport} />
          <ContactFiltersDialog
            filters={advancedFilters}
            onApply={setAdvancedFilters}
          />
          {view === "table" && <DataTableColumnToggle table={table} />}
          <ContactFormDialog mode="create" onSubmit={handleCreateContact} />
          <ViewToggle views={viewOptions} value={view} onChange={updateView} />
        </div>
      </div>

      {/* Status filters */}
      <StatusFilter
        allStatuses={allContactStatuses}
        statusConfig={contactStatusConfig}
        selectedStatuses={selectedStatuses}
        onStatusChange={setSelectedStatuses}
      />

      {/* Content */}
      <div className="relative flex-1">
        {view === "table" && (
          <div className="space-y-4">
            <DataTableToolbar
              table={table}
              searchKey="firstName"
              searchPlaceholder="Search contacts..."
              filterColumn="status"
              filterOptions={contactStatusOptions}
            />
            <div className="rounded-md border">
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
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className="table-row-optimized"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
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
            {filteredContacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onEdit={handleEdit}
                onDelete={handleDelete}
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
              onClick={handleBulkCreateApplications}
            >
              <FileText className="mr-2 size-4" />
              Create Applications
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
