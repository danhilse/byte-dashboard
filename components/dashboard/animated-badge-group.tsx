"use client"

import { motion } from "framer-motion"
import { CircleDot } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatStatus } from "@/lib/utils"
import { getWorkflowStatusBadgeVariant } from "@/lib/status-utils"

interface StatusItem {
  status: string
  count: number
}

interface AnimatedBadgeGroupProps {
  statuses: StatusItem[]
}

export function AnimatedBadgeGroup({ statuses }: AnimatedBadgeGroupProps) {
  if (statuses.length === 0) {
    return <span className="text-xs text-muted-foreground">No workflow status data yet.</span>
  }

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {statuses.map((status, index) => (
        <motion.div
          key={status.status}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            delay: index * 0.07,
            duration: 0.5,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          <Badge variant={getWorkflowStatusBadgeVariant(status.status)} className="gap-1.5 cursor-default">
            <CircleDot className="size-3" />
            {formatStatus(status.status)} ({status.count})
          </Badge>
        </motion.div>
      ))}
    </div>
  )
}
