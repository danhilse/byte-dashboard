"use client"

import { useState, useMemo, useCallback, useEffect, memo, type ReactNode } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface KanbanColumn<S extends string> {
  id: S
  title: string
  color?: string
}

export interface KanbanItem {
  id: string
  [key: string]: unknown
}

interface GenericKanbanBoardProps<T extends KanbanItem, S extends string> {
  items: T[]
  columns: KanbanColumn<S>[]
  getItemStatus: (item: T) => S
  setItemStatus: (item: T, status: S) => T
  renderCard: (item: T, props?: { onClick?: () => void; className?: string }) => ReactNode
  renderOverlayCard: (item: T) => ReactNode
  onStatusChange?: (itemId: string, newStatus: S) => void
  onItemClick?: (item: T) => void
  gridClassName?: string
  enableReordering?: boolean
  emptyStateText?: string
}

export function GenericKanbanBoard<T extends KanbanItem, S extends string>({
  items: initialItems,
  columns,
  getItemStatus,
  setItemStatus,
  renderCard,
  renderOverlayCard,
  onStatusChange,
  onItemClick,
  gridClassName = "grid h-[calc(100vh-12rem)] auto-cols-fr grid-flow-col gap-4",
  enableReordering = false,
  emptyStateText = "Drop items here",
}: GenericKanbanBoardProps<T, S>) {
  const [items, setItems] = useState<T[]>(initialItems)
  const [activeItem, setActiveItem] = useState<T | null>(null)

  // Sync with parent when initialItems changes
  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Memoize items grouped by status
  const itemsByStatus = useMemo(() => {
    return columns.reduce(
      (acc, col) => {
        acc[col.id] = items.filter((item) => getItemStatus(item) === col.id)
        return acc
      },
      {} as Record<S, T[]>
    )
  }, [items, columns, getItemStatus])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    setItems((currentItems) => {
      const item = currentItems.find((i) => i.id === active.id)
      if (item) {
        setActiveItem(item)
      }
      return currentItems
    })
  }, [])

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return

      const activeId = active.id as string
      const overId = over.id as string

      const isOverColumn = columns.some((col) => col.id === overId)

      setItems((prev) => {
        const activeItem = prev.find((i) => i.id === activeId)
        if (!activeItem) return prev

        if (isOverColumn) {
          const newStatus = overId as S
          if (getItemStatus(activeItem) !== newStatus) {
            return prev.map((i) =>
              i.id === activeId ? setItemStatus(i, newStatus) : i
            )
          }
          return prev
        }

        const overItem = prev.find((i) => i.id === overId)
        if (overItem && getItemStatus(activeItem) !== getItemStatus(overItem)) {
          return prev.map((i) =>
            i.id === activeId ? setItemStatus(i, getItemStatus(overItem)) : i
          )
        }
        return prev
      })
    },
    [columns, getItemStatus, setItemStatus]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveItem(null)

      if (!over) return

      const activeId = active.id as string
      const overId = over.id as string

      if (activeId === overId) return

      // Notify parent of status change
      const movedItem = items.find((i) => i.id === activeId)
      const originalItem = initialItems.find((i) => i.id === activeId)
      if (movedItem && originalItem && getItemStatus(movedItem) !== getItemStatus(originalItem)) {
        onStatusChange?.(activeId, getItemStatus(movedItem))
      }

      // Handle reordering within same column if enabled
      if (enableReordering) {
        setItems((prev) => {
          const activeItem = prev.find((i) => i.id === activeId)
          const overItem = prev.find((i) => i.id === overId)

          if (!activeItem) return prev

          if (overItem && getItemStatus(activeItem) === getItemStatus(overItem)) {
            const columnItems = prev.filter((i) => getItemStatus(i) === getItemStatus(activeItem))
            const oldIndex = columnItems.findIndex((i) => i.id === activeId)
            const newIndex = columnItems.findIndex((i) => i.id === overId)

            if (oldIndex !== newIndex) {
              const newColumnItems = arrayMove(columnItems, oldIndex, newIndex)
              const otherItems = prev.filter((i) => getItemStatus(i) !== getItemStatus(activeItem))
              return [...otherItems, ...newColumnItems]
            }
          }
          return prev
        })
      }
    },
    [items, initialItems, getItemStatus, onStatusChange, enableReordering]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={gridClassName}>
        {columns.map((column) => (
          <KanbanColumnGeneric
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            items={itemsByStatus[column.id]}
            renderCard={renderCard}
            onItemClick={onItemClick}
            emptyStateText={emptyStateText}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem && renderOverlayCard(activeItem)}
      </DragOverlay>
    </DndContext>
  )
}

interface KanbanColumnGenericProps<T extends KanbanItem> {
  id: string
  title: string
  color?: string
  items: T[]
  renderCard: (item: T, props?: { onClick?: () => void; className?: string }) => ReactNode
  onItemClick?: (item: T) => void
  emptyStateText: string
}

const KanbanColumnGeneric = memo(function KanbanColumnGeneric<T extends KanbanItem>({
  id,
  title,
  color,
  items,
  renderCard,
  onItemClick,
  emptyStateText,
}: KanbanColumnGenericProps<T>) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <Card className={cn("flex h-full flex-col border-t-4", color || "border-t-slate-500")}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {items.length}
          </span>
        </div>
      </CardHeader>
      <CardContent
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 overflow-auto p-2 pt-0 transition-colors",
          isOver && "bg-muted/50"
        )}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) =>
            renderCard(item, {
              onClick: onItemClick ? () => onItemClick(item) : undefined,
              className: "kanban-card-optimized",
            })
          )}
        </SortableContext>
        {items.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            {emptyStateText}
          </div>
        )}
      </CardContent>
    </Card>
  )
}) as <T extends KanbanItem>(props: KanbanColumnGenericProps<T>) => ReactNode
