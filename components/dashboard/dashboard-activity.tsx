"use client"

import { formatDistanceToNow } from "date-fns"
import { UserPlus, FileText, MessageSquare, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { activityColors } from "@/lib/design-tokens"
import { getInitials } from "@/lib/utils"
import type { ActivityLogRow } from "@/types"

const actionIcons: Record<string, typeof UserPlus> = {
  created: UserPlus,
  updated: FileText,
  deleted: FileText,
  status_changed: RefreshCw,
  note_added: MessageSquare,
}

const actionToActivityType: Record<string, keyof typeof activityColors> = {
  created: "contact_created",
  updated: "status_changed",
  deleted: "status_changed",
  status_changed: "status_changed",
  note_added: "note_added",
}

function formatDescription(
  action: string,
  entityType: string,
  details: Record<string, unknown>
): string {
  switch (action) {
    case "created":
      if (details.title) return `created task "${String(details.title)}"`
      if (details.firstName) return `added contact ${String(details.firstName)} ${String(details.lastName || "")}`
      return `created a ${entityType}`
    case "updated":
      if (details.action === "claimed") return `claimed a task`
      return `updated a ${entityType}`
    case "deleted":
      return `deleted a ${entityType}`
    case "status_changed":
      if (details.outcome) return `${String(details.outcome)} a task`
      if (details.from && details.to) return `changed ${entityType} status to ${String(details.to)}`
      return `changed ${entityType} status`
    case "note_added":
      return `added a note on a ${entityType}`
    default:
      return `${action} a ${entityType}`
  }
}

interface DashboardActivityProps {
  activities: ActivityLogRow[]
}

export function DashboardActivity({ activities }: DashboardActivityProps) {
  return (
    <Card className="animate-slide-up stagger-1">
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <CardDescription>Latest updates across your platform</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = actionIcons[activity.action] ?? FileText
              const activityType = actionToActivityType[activity.action] ?? "status_changed"
              const colorClass = activityColors[activityType]

              return (
                <div
                  key={activity.id}
                  className="group/activity flex items-start gap-4 rounded-lg p-2 -mx-2 transition-colors duration-150 hover:bg-accent/50"
                >
                  <Avatar className="size-9 ring-1 ring-border transition-all duration-200 group-hover/activity:ring-2 group-hover/activity:ring-primary/20">
                    <AvatarFallback className="text-xs font-medium bg-primary/5">
                      {getInitials(activity.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm leading-relaxed">
                      <span className="font-medium">{activity.userName}</span>{" "}
                      <span className="text-muted-foreground">
                        {formatDescription(activity.action, activity.entityType, activity.details)}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className={`rounded-md bg-accent/50 p-1 ${colorClass}`}>
                        <Icon className="size-3" />
                      </div>
                      <span>
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
