"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedAttentionItemProps {
  label: string
  value: number
  isAlert?: boolean
  delay?: number
}

export function AnimatedAttentionItem({ label, value, isAlert, delay = 0 }: AnimatedAttentionItemProps) {
  return (
    <motion.div
      className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold tabular-nums", isAlert && value > 0 && "text-destructive")}>{value}</p>
    </motion.div>
  )
}
