import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WorkflowStatusBadge } from "@/components/common/status-badge"
import type { WorkflowStatus } from "@/types"

interface RecentWorkflow {
  id: string
  status: string
  startedAt: string
  contactName: string
  definitionName?: string
}

interface RecentWorkflowsWidgetProps {
  workflows: RecentWorkflow[]
}

export function RecentWorkflowsWidget({ workflows }: RecentWorkflowsWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Workflows</CardTitle>
        <CardDescription>Latest workflow executions</CardDescription>
      </CardHeader>
      <CardContent>
        {workflows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workflows yet.</p>
        ) : (
          <div className="space-y-3">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {workflow.definitionName
                      ? `${workflow.definitionName} - ${workflow.contactName}`
                      : workflow.contactName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(workflow.startedAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <WorkflowStatusBadge status={workflow.status as WorkflowStatus} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
