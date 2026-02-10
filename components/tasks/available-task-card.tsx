"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { Calendar, Link2, Loader2 } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TaskPriorityBadge } from "@/components/common/status-badge"
import { getTaskLinks } from "@/lib/tasks/presentation"
import type { Task } from "@/types"

interface AvailableTaskCardProps {
  task: Task
  onClaim: (taskId: string) => Promise<void>
}

export function AvailableTaskCard({ task, onClaim }: AvailableTaskCardProps) {
  const [isClaiming, setIsClaiming] = useState(false)
  const links = getTaskLinks(task.metadata)

  const handleClaim = async () => {
    setIsClaiming(true)
    try {
      await onClaim(task.id)
    } finally {
      setIsClaiming(false)
    }
  }

  return (
    <Card
      className={`flex items-center gap-4 p-4 ${
        task.taskType === "approval"
          ? "border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-background to-emerald-50/40 dark:border-amber-900/40 dark:from-amber-950/20 dark:via-background dark:to-emerald-950/15"
          : ""
      }`}
    >
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
                {format(parseISO(task.dueDate), "MMM d")}
              </span>
            )}
            {links.length > 0 && (
              <span className="flex items-center gap-1">
                <Link2 className="size-3" />
                {links.length} link{links.length === 1 ? "" : "s"}
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
