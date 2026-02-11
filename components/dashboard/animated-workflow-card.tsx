"use client"

import { motion } from "framer-motion"
import { formatDistanceToNowStrict } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { formatStatus } from "@/lib/utils"
import { getWorkflowStatusBadgeVariant } from "@/lib/status-utils"

interface AnimatedWorkflowCardProps {
  workflow: {
    id: string
    definitionName: string | null | undefined
    contactName: string
    status: string
    startedAt: string | Date
  }
  delay?: number
}

export function AnimatedWorkflowCard({ workflow, delay = 0 }: AnimatedWorkflowCardProps) {
  return (
    <motion.div
      className="flex items-start justify-between gap-3 rounded-lg border p-3 cursor-pointer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      <div className="space-y-1 flex-1">
        <p className="text-sm font-medium">{workflow.definitionName ?? "Untitled Workflow"}</p>
        <p className="text-xs text-muted-foreground">{workflow.contactName}</p>
        <p className="text-xs text-muted-foreground">
          Started {formatDistanceToNowStrict(new Date(workflow.startedAt), { addSuffix: true })}
        </p>
      </div>
      <Badge variant={getWorkflowStatusBadgeVariant(workflow.status)}>{formatStatus(workflow.status)}</Badge>
    </motion.div>
  )
}
