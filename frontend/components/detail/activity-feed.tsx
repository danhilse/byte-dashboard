import { formatDistanceToNow } from "date-fns"
import { UserPlus, FileText, CheckCircle2, MessageSquare, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Activity } from "@/types"

const activityIcons = {
  contact_created: UserPlus,
  application_submitted: FileText,
  task_completed: CheckCircle2,
  note_added: MessageSquare,
  status_changed: RefreshCw,
}

interface ActivityFeedProps {
  activities: Activity[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
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
            const Icon = activityIcons[activity.type]
            const isLast = index === activities.length - 1

            return (
              <div key={activity.id} className="flex gap-4 activity-item-optimized">
                <div className="relative flex flex-col items-center">
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-4" />
                  </div>
                  {!isLast && (
                    <div className="absolute top-8 h-full w-px bg-border" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-sm">{activity.description}</p>
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
