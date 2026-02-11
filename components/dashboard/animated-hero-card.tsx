"use client"

import { ReactNode } from "react"
import { motion } from "framer-motion"

interface AnimatedHeroCardProps {
  children: ReactNode
  className?: string
}

/**
 * Premium animated hero card with gradient background and subtle floating effect
 */
export function AnimatedHeroCard({ children, className }: AnimatedHeroCardProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
