"use client"

import { motion } from "framer-motion"
import { format, formatDistanceToNowStrict, isBefore, startOfDay } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { cn, formatStatus } from "@/lib/utils"

interface AnimatedTaskCardProps {
  task: {
    id: string
    title: string
    priority: string
    dueDate: string | Date | null
  }
  delay?: number
}

export function AnimatedTaskCard({ task, delay = 0 }: AnimatedTaskCardProps) {
  const today = startOfDay(new Date())
  const dueAt = task.dueDate ? (task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate)) : null
  const isOverdue = dueAt && isBefore(startOfDay(dueAt), today)
  const normalizedPriority = String(task.priority).toLowerCase()

  const dueLabel = dueAt
    ? isOverdue
      ? `Overdue ${formatDistanceToNowStrict(dueAt, { addSuffix: true })}`
      : `Due ${format(dueAt, "EEE, MMM d")}`
    : "No due date"

  return (
    <motion.div
      className="rounded-lg border border-border/60 bg-muted/20 p-3 cursor-pointer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        <Badge variant={normalizedPriority === "urgent" ? "destructive" : "secondary"}>
          {formatStatus(task.priority)}
        </Badge>
      </div>
      <p className={cn("mt-2 text-xs", isOverdue ? "text-destructive" : "text-muted-foreground")}>{dueLabel}</p>
    </motion.div>
  )
}
