"use client"

import { ReactNode } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedTableRowProps {
  children: ReactNode
  delay?: number
  dataState?: string
  className?: string
}

export function AnimatedTableRow({ children, delay = 0, dataState, className }: AnimatedTableRowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        delay,
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      data-state={dataState}
      data-slot="table-row"
      className={cn(
        "hover:bg-accent/30 data-[state=selected]:bg-accent/50 border-b transition-all duration-150 group/row",
        className
      )}
    >
      {children}
    </motion.tr>
  )
}
