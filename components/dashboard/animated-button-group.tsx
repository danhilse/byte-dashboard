"use client"

import { ReactNode } from "react"
import { motion } from "framer-motion"

interface AnimatedButtonGroupProps {
  children: ReactNode
  delay?: number
}

export function AnimatedButtonGroup({ children, delay = 0 }: AnimatedButtonGroupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
