import { useState, useCallback } from "react"

interface UseDetailDialogEditOptions<T> {
  item: T | null
  onUpdate?: (item: T) => void
  onDelete?: (itemId: string) => void
  onClose?: () => void
}

export function useDetailDialogEdit<T extends { id: string }>({
  item,
  onUpdate,
  onDelete,
  onClose,
}: UseDetailDialogEditOptions<T>) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedItem, setEditedItem] = useState<T | null>(null)

  const displayItem = isEditing && editedItem ? editedItem : item

  const handleEdit = useCallback(() => {
    setEditedItem(item)
    setIsEditing(true)
  }, [item])

  const handleSave = useCallback(() => {
    if (editedItem) {
      onUpdate?.(editedItem)
      setIsEditing(false)
    }
  }, [editedItem, onUpdate])

  const handleCancel = useCallback(() => {
    setEditedItem(null)
    setIsEditing(false)
  }, [])

  const handleDelete = useCallback(() => {
    if (item) {
      onDelete?.(item.id)
      onClose?.()
    }
  }, [item, onDelete, onClose])

  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setEditedItem((prev) => (prev ? { ...prev, [field]: value } : null))
  }, [])

  const handleQuickStatusUpdate = useCallback(
    (newStatus: any) => {
      if (item) {
        onUpdate?.({ ...item, status: newStatus } as T)
      }
    },
    [item, onUpdate]
  )

  return {
    isEditing,
    editedItem,
    displayItem,
    handleEdit,
    handleSave,
    handleCancel,
    handleDelete,
    updateField,
    handleQuickStatusUpdate,
  }
}
