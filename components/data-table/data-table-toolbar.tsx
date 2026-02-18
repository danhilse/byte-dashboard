"use client"

import type { Table } from "@tanstack/react-table"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchKey?: string
  searchPlaceholder?: string
  filterColumn?: string
  filterOptions?: { label: string; value: string }[]
  searchValue?: string
  onSearchValueChange?: (value: string) => void
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder = "Search...",
  filterColumn,
  filterOptions,
  searchValue,
  onSearchValueChange,
}: DataTableToolbarProps<TData>) {
  const isControlledSearch =
    typeof searchValue === "string" && typeof onSearchValueChange === "function"
  const showSearch = Boolean(isControlledSearch || searchKey)
  const activeSearchValue = isControlledSearch
    ? searchValue
    : ((searchKey && (table.getColumn(searchKey)?.getFilterValue() as string)) ?? "")
  const isFiltered =
    table.getState().columnFilters.length > 0 || (isControlledSearch && activeSearchValue.trim().length > 0)

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {showSearch && (
          <Input
            placeholder={searchPlaceholder}
            value={activeSearchValue}
            onChange={(event) => {
              if (isControlledSearch) {
                onSearchValueChange(event.target.value)
                return
              }

              if (searchKey) {
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
            }}
            className="h-8 w-[150px] lg:w-[250px]"
          />
        )}
        {filterColumn && filterOptions && (
          <Select
            value={(table.getColumn(filterColumn)?.getFilterValue() as string) ?? "all"}
            onValueChange={(value) =>
              table.getColumn(filterColumn)?.setFilterValue(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {filterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              if (isControlledSearch) {
                onSearchValueChange("")
              }
              table.resetColumnFilters()
            }}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
