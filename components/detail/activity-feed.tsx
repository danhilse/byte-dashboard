"use client"

import { useState, useEffect, useCallback } from "react"
import { formatDistanceToNow } from "date-fns"
import { UserPlus, FileText, MessageSquare, RefreshCw, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ActivityLogRow } from "@/types"

const actionIcons: Record<string, typeof UserPlus> = {
  created: UserPlus,
  updated: FileText,
  deleted: FileText,
  status_changed: RefreshCw,
  note_added: MessageSquare,
}

function formatAction(action: string, entityType: string, details: Record<string, unknown>): string {
  switch (action) {
    case "created":
      return `Created ${entityType}`
    case "updated":
      if (details.action === "claimed") return `Claimed ${entityType}`
      return `Updated ${entityType}`
    case "deleted":
      return `Deleted ${entityType}`
    case "status_changed": {
      if (details.outcome) return `${String(details.outcome)} ${entityType}`
      if (details.from && details.to) return `Changed status from ${String(details.from)} to ${String(details.to)}`
      if (details.status) return `Status changed to ${String(details.status)}`
      return `Status changed`
    }
    case "note_added":
      return `Added a note`
    default:
      return action
  }
}

interface ActivityFeedProps {
  entityType: "contact" | "workflow" | "task"
  entityId: string
}

export function ActivityFeed({ entityType, entityId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityLogRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/activity?entityType=${entityType}&entityId=${entityId}&limit=20`
      )
      if (!res.ok) return
      const data = await res.json()
      setActivities(data.activities)
    } catch (error) {
      console.error("Failed to fetch activity:", error)
    } finally {
      setIsLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {activities.map((activity, index) => {
            const Icon = actionIcons[activity.action] ?? FileText
            const isLast = index === activities.length - 1

            return (
              <div key={activity.id} className="flex gap-4">
                <div className="relative flex flex-col items-center">
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-4" />
                  </div>
                  {!isLast && (
                    <div className="absolute top-8 h-full w-px bg-border" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-sm">
                    {formatAction(activity.action, activity.entityType, activity.details)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.userName} &middot;{" "}
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
