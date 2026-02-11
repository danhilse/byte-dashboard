"use client"

import { ReactNode } from "react"
import { motion } from "framer-motion"

interface ShimmerCardProps {
  children: ReactNode
  delay?: number
  className?: string
}

/**
 * Card wrapper with shimmer effect on mount and hover
 */
export function ShimmerCard({ children, delay = 0, className }: ShimmerCardProps) {
  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{
        scale: 1.02,
        y: -6,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 30,
        },
      }}
      transition={{
        delay,
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {/* Shimmer effect overlay */}
      <motion.div
        className="absolute inset-0 -translate-x-full"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
          pointerEvents: "none",
        }}
        animate={{
          x: ["0%", "200%"],
        }}
        transition={{
          duration: 2,
          ease: "easeInOut",
          delay: delay + 0.3,
          repeat: 0,
        }}
      />
      {children}
    </motion.div>
  )
}
