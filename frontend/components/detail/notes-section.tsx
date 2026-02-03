"use client"

import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import type { Note } from "@/types"
import { useState } from "react"

interface NotesSectionProps {
  notes: Note[]
}

export function NotesSection({ notes }: NotesSectionProps) {
  const [isAdding, setIsAdding] = useState(false)

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
            <Textarea placeholder="Write a note..." className="min-h-[100px]" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button size="sm">Save Note</Button>
            </div>
          </div>
        )}
        {notes.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          notes.map((note) => {
            const initials = note.userName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()

            return (
              <div key={note.id} className="flex gap-3 rounded-lg border p-3">
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{note.userName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                    {note.content}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
