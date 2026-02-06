"use client"

import { type Table } from "@tanstack/react-table"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"

interface DataTableBulkActionsProps<TData> {
  table: Table<TData>
  children: React.ReactNode
}

export function DataTableBulkActions<TData>({
  table,
  children,
}: DataTableBulkActionsProps<TData>) {
  const selectedCount = table.getSelectedRowModel().rows.length

  if (selectedCount === 0) {
    return null
  }

  return (
    <div className="sticky bottom-4 z-10 mx-auto w-fit">
      <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-2 shadow-lg">
        <span className="text-sm font-medium">
          {selectedCount} {selectedCount === 1 ? "row" : "rows"} selected
        </span>
        <div className="h-4 w-px bg-border" />
        {children}
        <div className="h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => table.resetRowSelection()}
        >
          <X className="mr-1 size-4" />
          Clear
        </Button>
      </div>
    </div>
  )
}
