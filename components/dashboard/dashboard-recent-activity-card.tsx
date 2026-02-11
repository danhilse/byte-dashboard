"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { formatDistanceToNowStrict } from "date-fns"
import { Clock3, ContactRound, ListTodo, Workflow } from "lucide-react"
import { AnimatedCounter } from "@/components/common/animated-counter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type DashboardActivityItem = {
  id: string
  entityType: "workflow" | "contact" | "task"
  action: string
  createdAt: string
  userName: string
}

interface DashboardRecentActivityCardProps {
  activities: DashboardActivityItem[]
}

const INLINE_ACTIVITY_LIMIT = 5
const MODAL_PAGE_SIZE = 5

function formatAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function activityDotClass(entityType: DashboardActivityItem["entityType"]): string {
  if (entityType === "workflow") return "bg-blue-500/80"
  if (entityType === "task") return "bg-emerald-500/80"
  return "bg-amber-500/80"
}

function ActivityList({ activities }: { activities: DashboardActivityItem[] }) {
  return (
    <div className="space-y-3">
      {activities.map((item, index) => (
        <motion.div
          key={item.id}
          className="flex items-start gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: index * 0.05,
            duration: 0.5,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          <span className={cn("mt-1 size-2 rounded-full", activityDotClass(item.entityType))} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">
              <span className="font-medium">{item.userName}</span>{" "}
              <span className="text-muted-foreground">
                {formatAction(item.action).toLowerCase()} a {item.entityType}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNowStrict(new Date(item.createdAt), { addSuffix: true })}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export function DashboardRecentActivityCard({ activities }: DashboardRecentActivityCardProps) {
  const [open, setOpen] = useState(false)
  const [modalVisibleCount, setModalVisibleCount] = useState(MODAL_PAGE_SIZE)

  const activityByEntity = activities.reduce(
    (acc, item) => {
      acc[item.entityType] += 1
      return acc
    },
    { workflow: 0, task: 0, contact: 0 }
  )

  const inlineActivities = activities.slice(0, INLINE_ACTIVITY_LIMIT)
  const modalActivities = activities.slice(0, modalVisibleCount)
  const hasMoreModalActivities = modalVisibleCount < activities.length

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setModalVisibleCount(MODAL_PAGE_SIZE)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock3 className="size-4" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest updates across workflows, tasks, and contacts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Workflow className="size-3.5" />
                Workflows
              </div>
              <AnimatedCounter value={activityByEntity.workflow} className="mt-1 text-lg font-semibold block" />
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ListTodo className="size-3.5" />
                Tasks
              </div>
              <AnimatedCounter value={activityByEntity.task} className="mt-1 text-lg font-semibold block" />
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ContactRound className="size-3.5" />
                Contacts
              </div>
              <AnimatedCounter value={activityByEntity.contact} className="mt-1 text-lg font-semibold block" />
            </div>
          </div>

          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity logged.</p>
          ) : (
            <>
              <ActivityList activities={inlineActivities} />
              {activities.length > INLINE_ACTIVITY_LIMIT ? (
                <Button variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
                  View All Activity
                </Button>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[85vh] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Recent Activity</DialogTitle>
            <DialogDescription>Showing your latest activity across workflows, tasks, and contacts.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[55vh] pr-4">
            <ActivityList activities={modalActivities} />
          </ScrollArea>
          {hasMoreModalActivities ? (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setModalVisibleCount((prev) => prev + MODAL_PAGE_SIZE)}>
                Load More
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
