"use client"

import { motion } from "framer-motion"
import { AnimatedCounter } from "@/components/common/animated-counter"

interface AnimatedStatCardProps {
  label: string
  value: number
  delay?: number
}

export function AnimatedStatCard({ label, value, delay = 0 }: AnimatedStatCardProps) {
  return (
    <motion.div
      className="rounded-lg border border-white/20 bg-white/10 p-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.7,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      <p className="text-xs text-primary-foreground/75">{label}</p>
      <AnimatedCounter value={value} className="mt-2 text-2xl font-semibold block" />
    </motion.div>
  )
}
