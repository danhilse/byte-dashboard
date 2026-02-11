"use client"

import { useEffect, useRef } from "react"
import { motion, useInView, useMotionValue, useSpring } from "framer-motion"

interface AnimatedCounterProps {
  value: number
  className?: string
  prefix?: string
  suffix?: string
}

/**
 * Premium animated number counter with ultra-smooth spring physics
 */
export function AnimatedCounter({ value, className, prefix = "", suffix = "" }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, {
    stiffness: 60,
    damping: 25,
    mass: 0.8,
  })
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  useEffect(() => {
    if (isInView) {
      motionValue.set(value)
    }
  }, [motionValue, isInView, value])

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${Math.round(latest)}${suffix}`
      }
    })

    return () => unsubscribe()
  }, [springValue, prefix, suffix])

  return <motion.span ref={ref} className={className} />
}
