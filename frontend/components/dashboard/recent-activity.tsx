import { formatDistanceToNow } from "date-fns"
import { UserPlus, FileText, CheckCircle2, MessageSquare, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { activityColors } from "@/lib/design-tokens"
import { getInitials } from "@/lib/utils"
import type { Activity } from "@/types"

const activityIcons = {
  contact_created: UserPlus,
  application_submitted: FileText,
  task_completed: CheckCircle2,
  note_added: MessageSquare,
  status_changed: RefreshCw,
}

interface RecentActivityProps {
  activities: Activity[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest updates across your CRM</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.type]
            const colorClass = activityColors[activity.type]

            return (
              <div key={activity.id} className="flex items-start gap-4 activity-item-optimized">
                <Avatar className="size-9">
                  <AvatarFallback className="text-xs">
                    {getInitials(activity.userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">{activity.userName}</span>{" "}
                    <span className="text-muted-foreground">{activity.description}</span>
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon className={`size-3 ${colorClass}`} />
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
