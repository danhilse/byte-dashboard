/**
 * Reusable Framer Motion animation variants for consistent, premium animations
 * Enhanced with smoother physics and more sophisticated transitions
 */

import type { Variants } from "framer-motion"

/**
 * Premium easing curves
 */
export const premiumEasing = {
  // Easy ease - smooth acceleration and deceleration (After Effects style)
  easyEase: [0.25, 0.1, 0.25, 1],
  // Smooth deceleration curve
  smooth: [0.25, 0.46, 0.45, 0.94],
  // Ultra-smooth for premium feel
  butter: [0.33, 0.01, 0, 1],
  // Natural ease
  natural: [0.16, 1, 0.3, 1],
}

/**
 * Container variants for staggered children animations
 */
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.03,
    },
  },
}

/**
 * Card entrance animation - ultra-smooth slide up with fade
 */
export const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
    scale: 0.96,
    filter: "blur(4px)",
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 20,
      mass: 0.8,
    },
  },
}

/**
 * Premium hover effect for interactive cards with glow
 */
export const cardHoverVariants: Variants = {
  rest: {
    scale: 1,
    y: 0,
    boxShadow: "0 0 0 0px rgba(0,0,0,0)",
  },
  hover: {
    scale: 1.015,
    y: -4,
    boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
      mass: 0.5,
    },
  },
}

/**
 * List item stagger animation
 */
export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -10,
  },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 14,
    },
  },
}

/**
 * Fade in animation for elements
 */
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
}

/**
 * Scale in animation for modals/popovers
 */
export const scaleInVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
}

/**
 * Slide variants for directional animations
 */
export const slideVariants = {
  fromRight: {
    hidden: { opacity: 0, x: 20 },
    show: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  },
  fromLeft: {
    hidden: { opacity: 0, x: -20 },
    show: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  },
  fromBottom: {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  },
}

/**
 * Progress bar fill animation
 */
export const progressBarVariants: Variants = {
  hidden: { width: 0 },
  show: (width: number) => ({
    width: `${width}%`,
    transition: {
      duration: 1,
      ease: [0.16, 1, 0.3, 1],
      delay: 0.3,
    },
  }),
}

/**
 * Shimmer effect for loading states
 */
export const shimmerVariants: Variants = {
  initial: { backgroundPosition: "-200% 0" },
  animate: {
    backgroundPosition: "200% 0",
    transition: {
      duration: 2,
      ease: "linear",
      repeat: Infinity,
    },
  },
}
