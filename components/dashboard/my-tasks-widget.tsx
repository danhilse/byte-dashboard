import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { taskStatusConfig, taskPriorityConfig } from "@/lib/status-config"
import type { TaskStatus, TaskPriority } from "@/types"

interface MyTask {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  taskType: string
}

interface MyTasksWidgetProps {
  tasks: MyTask[]
}

export function MyTasksWidget({ tasks }: MyTasksWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">My Tasks</CardTitle>
        <CardDescription>Tasks assigned to you</CardDescription>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending tasks.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const statusCfg = taskStatusConfig[task.status as TaskStatus]
              const priorityCfg = taskPriorityConfig[task.priority as TaskPriority]
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      {priorityCfg && (
                        <Badge variant={priorityCfg.variant} className="text-xs">
                          {priorityCfg.label}
                        </Badge>
                      )}
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          Due {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                  {statusCfg && (
                    <Badge variant={statusCfg.variant} className="text-xs shrink-0">
                      {statusCfg.label}
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
