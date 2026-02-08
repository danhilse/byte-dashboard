"use client"

import { useState, useEffect, useCallback } from "react"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { getInitials } from "@/lib/utils"
import type { Note } from "@/types"

interface NotesSectionProps {
  entityType: "contact" | "workflow" | "task"
  entityId: string
}

export function NotesSection({ entityType, entityId }: NotesSectionProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [content, setContent] = useState("")

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/notes?entityType=${entityType}&entityId=${entityId}`
      )
      if (!res.ok) return
      const data = await res.json()
      setNotes(data.notes)
    } catch (error) {
      console.error("Failed to fetch notes:", error)
    } finally {
      setIsLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const handleSave = async () => {
    if (!content.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, content: content.trim() }),
      })
      if (!res.ok) return
      const data = await res.json()
      setNotes((prev) => [data.note, ...prev])
      setContent("")
      setIsAdding(false)
    } catch (error) {
      console.error("Failed to save note:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" })
      if (!res.ok) return
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } catch (error) {
      console.error("Failed to delete note:", error)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notes</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setIsAdding(!isAdding)}>
          <Plus className="mr-2 size-4" />
          Add Note
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="space-y-2">
            <Textarea
              placeholder="Write a note..."
              className="min-h-[100px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false)
                  setContent("")
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!content.trim() || isSaving}
              >
                {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save Note
              </Button>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="group flex gap-3 rounded-lg border p-3">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">
                  {getInitials(note.userName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{note.userName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(note.id)}
                  >
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                </div>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
