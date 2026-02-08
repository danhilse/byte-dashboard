import { formatDistanceToNow } from "date-fns"
import { UserPlus, FileText, CheckCircle2, MessageSquare, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { activityColors } from "@/lib/design-tokens"
import { getInitials } from "@/lib/utils"
import type { Activity } from "@/types"

const activityIcons = {
  contact_created: UserPlus,
  workflow_submitted: FileText,
  task_completed: CheckCircle2,
  note_added: MessageSquare,
  status_changed: RefreshCw,
  asset_uploaded: FileText,
}

interface RecentActivityProps {
  activities: Activity[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card className="animate-slide-up stagger-1">
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <CardDescription>Latest updates across your platform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.type]
            const colorClass = activityColors[activity.type]

            return (
              <div
                key={activity.id}
                className="group/activity flex items-start gap-4 rounded-lg p-2 -mx-2 transition-colors duration-150 hover:bg-accent/50 activity-item-optimized"
              >
                <Avatar className="size-9 ring-1 ring-border transition-all duration-200 group-hover/activity:ring-2 group-hover/activity:ring-primary/20">
                  <AvatarFallback className="text-xs font-medium bg-primary/5">
                    {getInitials(activity.userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1 min-w-0">
                  <p className="text-sm leading-relaxed">
                    <span className="font-medium">{activity.userName}</span>{" "}
                    <span className="text-muted-foreground">{activity.description}</span>
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
      </CardContent>
    </Card>
  )
}
