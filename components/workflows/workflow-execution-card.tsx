"use client"

import { format } from "date-fns"
import { Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface WorkflowExecutionCardProps {
  workflow: {
    id: string
    status: string
    currentStepId?: string | null
    currentPhaseId?: string | null
    startedAt: string
    completedAt?: string | null
    contact?: {
      firstName: string
      lastName: string
      email?: string
    } | null
  }
}

/**
 * Workflow Execution Card
 *
 * Displays the current state of a workflow execution for Phase 2 testing
 */
export function WorkflowExecutionCard({ workflow }: WorkflowExecutionCardProps) {
  const getStatusIcon = () => {
    switch (workflow.status) {
      case "running":
      case "in_review":
        return <Loader2 className="size-4 animate-spin text-blue-500" />
      case "approved":
      case "completed":
        return <CheckCircle2 className="size-4 text-green-500" />
      case "rejected":
        return <XCircle className="size-4 text-red-500" />
      default:
        return <Clock className="size-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = () => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      running: "default",
      in_review: "default",
      approved: "outline",
      rejected: "destructive",
      completed: "outline",
      timeout: "secondary",
    }

    return (
      <Badge variant={variants[workflow.status] || "secondary"}>
        {workflow.status.replace("_", " ")}
      </Badge>
    )
  }

  const getStepName = (stepId?: string | null) => {
    if (!stepId) return null

    const stepNames: Record<string, string> = {
      "step-1-review": "Initial Review",
      "step-2-create-review-task": "Review Task Created",
      "step-4-approval": "Manager Approval",
      "step-4-create-approval-task": "Approval Task Created",
      "step-6-approved": "Approved",
      "step-8-rejected": "Rejected",
    }

    return stepNames[stepId] || stepId
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">
              {workflow.contact
                ? `${workflow.contact.firstName} ${workflow.contact.lastName}`
                : "Workflow Execution"}
            </CardTitle>
            <CardDescription className="text-xs">
              ID: {workflow.id.slice(0, 8)}...
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <dl className="space-y-2 text-sm">
          {workflow.currentStepId && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Current Step:</dt>
              <dd className="font-medium">{getStepName(workflow.currentStepId)}</dd>
            </div>
          )}

          <div className="flex justify-between">
            <dt className="text-muted-foreground">Started:</dt>
            <dd>{format(new Date(workflow.startedAt), "MMM d, yyyy h:mm a")}</dd>
          </div>

          {workflow.completedAt && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Completed:</dt>
              <dd>{format(new Date(workflow.completedAt), "MMM d, yyyy h:mm a")}</dd>
            </div>
          )}

          {workflow.contact?.email && (
            <div className="flex justify-between pt-2 border-t">
              <dt className="text-muted-foreground">Contact:</dt>
              <dd className="text-xs">{workflow.contact.email}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  )
}
