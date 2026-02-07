"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Calendar, Loader2 } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TaskPriorityBadge } from "@/components/common/status-badge"
import type { Task } from "@/types"

interface AvailableTaskCardProps {
  task: Task
  onClaim: (taskId: string) => Promise<void>
}

export function AvailableTaskCard({ task, onClaim }: AvailableTaskCardProps) {
  const [isClaiming, setIsClaiming] = useState(false)

  const handleClaim = async () => {
    setIsClaiming(true)
    try {
      await onClaim(task.id)
    } finally {
      setIsClaiming(false)
    }
  }

  return (
    <Card className="flex items-center gap-4 p-4">
      <CardContent className="flex flex-1 items-center gap-4 p-0">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{task.title}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <TaskPriorityBadge priority={task.priority} />
            {task.assignedRole && (
              <Badge variant="outline" className="text-xs">
                {task.assignedRole}
              </Badge>
            )}
            {task.dueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {format(new Date(task.dueDate), "MMM d")}
              </span>
            )}
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleClaim}
          disabled={isClaiming}
        >
          {isClaiming ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Claiming...
            </>
          ) : (
            "Claim"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
