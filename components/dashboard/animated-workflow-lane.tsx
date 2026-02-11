"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedWorkflowLaneProps {
  label: string
  count: number
  total: number
  className: string
  delay?: number
}

export function AnimatedWorkflowLane({ label, count, total, className, delay = 0 }: AnimatedWorkflowLaneProps) {
  const width = total > 0 ? Math.max(6, Math.round((count / total) * 100)) : 0

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{count}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn("h-2 rounded-full", className)}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{
            duration: 1.2,
            ease: [0.25, 0.1, 0.25, 1],
            delay: delay + 0.25,
          }}
        />
      </div>
    </motion.div>
  )
}
