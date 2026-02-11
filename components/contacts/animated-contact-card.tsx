"use client"

import { motion } from "framer-motion"
import { ContactCard } from "./contact-card"
import type { Contact } from "@/types"

interface AnimatedContactCardProps {
  contact: Contact
  onEdit: (contact: Contact) => void
  onDelete: (contact: Contact) => void
  delay?: number
}

export function AnimatedContactCard({ contact, onEdit, onDelete, delay = 0 }: AnimatedContactCardProps) {
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
      <ContactCard contact={contact} onEdit={onEdit} onDelete={onDelete} />
    </motion.div>
  )
}
