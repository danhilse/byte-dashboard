"use client"

import { ReactNode } from "react"
import { motion } from "framer-motion"

interface FloatingHeroCardProps {
  children: ReactNode
  className?: string
}

/**
 * Premium hero card with subtle floating/breathing animation
 */
export function FloatingHeroCard({ children, className }: FloatingHeroCardProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{
        opacity: 1,
        y: [0, -4, 0],
        scale: 1,
      }}
      transition={{
        opacity: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
        scale: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
        y: {
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.8,
        },
      }}
      style={{
        willChange: "transform",
      }}
    >
      {children}
    </motion.div>
  )
}
