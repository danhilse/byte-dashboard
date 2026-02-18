import { Suspense } from "react"
import Link from "next/link"
import { addDays, isAfter, isBefore, startOfDay } from "date-fns"
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Layers3,
  ListTodo,
  Sparkles,
  Workflow,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { DashboardRecentActivityCard } from "@/components/dashboard/dashboard-recent-activity-card"
import { AnimatedStatCard } from "@/components/dashboard/animated-stat-card"
import { AnimatedWorkflowLane } from "@/components/dashboard/animated-workflow-lane"
import { AnimatedAttentionItem } from "@/components/dashboard/animated-attention-item"
import { AnimatedTaskCard } from "@/components/dashboard/animated-task-card"
import { AnimatedWorkflowCard } from "@/components/dashboard/animated-workflow-card"
import { AnimatedBadgeGroup } from "@/components/dashboard/animated-badge-group"
import { AnimatedButtonGroup } from "@/components/dashboard/animated-button-group"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getDashboardStats,
  getMyTasks,
  getRecentActivity,
  getRecentWorkflows,
  getWorkflowCountsByStatus,
} from "@/lib/db/queries"
import { requirePageAuth } from "@/lib/auth/page-guard"

const BLOCKED_STATUS_KEYWORDS = ["error", "failed", "timeout", "cancel", "reject", "hold"]
const COMPLETED_STATUS_KEYWORDS = ["complete", "approved", "done", "success", "closed"]
const ATTENTION_STATUS_KEYWORDS = ["pending", "review", "draft"]

function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "bigint") return Number(value)
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase().replace(/\s+/g, "_")
}

function includesStatusKeyword(status: string, keywords: string[]): boolean {
  return keywords.some((keyword) => status.includes(keyword))
}

function parseMaybeDate(value: string | Date | null): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value
  const parsed = new Date(normalizedValue)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

// Removed: WorkflowLane - replaced with AnimatedWorkflowLane client component

function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Hero Section */}
      <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        {/* Hero Card */}
        <Card className="border-0 bg-gradient-to-br from-primary/95 via-primary to-slate-800">
          <CardContent className="p-6 md:p-7">
            <div className="flex h-full flex-col justify-between gap-6">
              <div className="space-y-3">
                <Skeleton className="h-6 w-32 rounded-full bg-white/20" />
                <Skeleton className="h-8 w-full max-w-lg bg-white/20" />
                <Skeleton className="h-5 w-full max-w-md bg-white/15" />
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg bg-white/15" />
                ))}
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-36 rounded-md bg-white/20" />
                <Skeleton className="h-9 w-32 rounded-md bg-white/15" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attention Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Three Column Section */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* My Priorities */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </CardContent>
        </Card>

        {/* Workflow Status */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-24 rounded-full" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Workflows */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-52" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Two Column Section */}
      <section className="grid gap-4 xl:grid-cols-2">
        {/* Workflows Needing Attention */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

async function DashboardContent() {
  const { userId, orgId } = await requirePageAuth({
    requiredPermission: "dashboard.read",
  })

  const [stats, workflowsByStatus, myTasks, recentWorkflows, recentActivity] = await Promise.all([
    getDashboardStats(orgId),
    getWorkflowCountsByStatus(orgId),
    getMyTasks(orgId, userId, 8),
    getRecentWorkflows(orgId, 8),
    getRecentActivity(orgId, 30),
  ])

  const totalWorkflows = workflowsByStatus.reduce((sum, row) => sum + toNumber(row.count), 0)
  const lanes = workflowsByStatus.reduce(
    (acc, row) => {
      const normalized = normalizeStatus(String(row.status ?? "unknown"))
      const count = toNumber(row.count)

      if (includesStatusKeyword(normalized, BLOCKED_STATUS_KEYWORDS)) {
        acc.blocked += count
      } else if (includesStatusKeyword(normalized, COMPLETED_STATUS_KEYWORDS)) {
        acc.completed += count
      } else {
        acc.active += count
      }

      return acc
    },
    { active: 0, blocked: 0, completed: 0 }
  )

  const topStatuses = workflowsByStatus
    .map((row) => ({
      status: String(row.status ?? "unknown"),
      count: toNumber(row.count),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const parsedTasks = myTasks.map((task) => ({
    ...task,
    normalizedPriority: String(task.priority).toLowerCase(),
    dueAt: parseMaybeDate(task.dueDate),
  }))

  const today = startOfDay(new Date())
  const dueSoonWindow = addDays(today, 3)

  const overdueTasks = parsedTasks.filter((task) => task.dueAt && isBefore(startOfDay(task.dueAt), today))
  const dueSoonTasks = parsedTasks.filter(
    (task) =>
      task.dueAt &&
      !isBefore(startOfDay(task.dueAt), today) &&
      !isAfter(startOfDay(task.dueAt), dueSoonWindow)
  )
  const highPriorityTasks = parsedTasks.filter(
    (task) => task.normalizedPriority === "urgent" || task.normalizedPriority === "high"
  )

  const attentionWorkflows = recentWorkflows.filter((workflow) => {
    const normalized = normalizeStatus(workflow.status)
    return (
      includesStatusKeyword(normalized, BLOCKED_STATUS_KEYWORDS) ||
      includesStatusKeyword(normalized, ATTENTION_STATUS_KEYWORDS)
    )
  })

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="border-0 bg-gradient-to-br from-primary/95 via-primary to-slate-800 text-primary-foreground shadow-refined-lg">
          <CardContent className="p-6 md:p-7">
            <div className="flex h-full flex-col justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                  <Sparkles className="size-3.5" />
                  Dashboard Overview
                </div>
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  Current status across workflows, tasks, and activity.
                </h1>
                <p className="max-w-2xl text-sm text-primary-foreground/80 md:text-base">
                  {stats.activeWorkflows} active workflows, {stats.pendingTasks} open tasks, and{" "}
                  {stats.completedTasksThisWeek} tasks completed this week.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <AnimatedStatCard label="Contacts" value={stats.totalContacts} delay={0.2} />
                <AnimatedStatCard label="Active Workflows" value={stats.activeWorkflows} delay={0.3} />
                <AnimatedStatCard label="Open Tasks" value={stats.pendingTasks} delay={0.4} />
                <AnimatedStatCard label="Completed This Week" value={stats.completedTasksThisWeek} delay={0.5} />
              </div>

              <div className="flex flex-wrap gap-2">
                <AnimatedButtonGroup delay={0.7}>
                  <Button variant="secondary" className="h-9" asChild>
                    <Link href="/workflows">
                      Open Workflows
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                </AnimatedButtonGroup>
                <AnimatedButtonGroup delay={0.8}>
                  <Button
                    variant="outline"
                    className="h-9 border-white/30 bg-transparent text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
                    asChild
                  >
                    <Link href="/my-work">Open My Work</Link>
                  </Button>
                </AnimatedButtonGroup>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4" />
              Needs Attention Today
            </CardTitle>
            <CardDescription>Items that need near-term action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <AnimatedAttentionItem
              label="Overdue tasks"
              value={overdueTasks.length}
              isAlert={overdueTasks.length > 0}
              delay={0.1}
            />
            <AnimatedAttentionItem label="Tasks due in 72h" value={dueSoonTasks.length} delay={0.2} />
            <AnimatedAttentionItem label="High / urgent assigned" value={highPriorityTasks.length} delay={0.3} />
            <AnimatedAttentionItem
              label="Blocked workflows"
              value={lanes.blocked}
              isAlert={lanes.blocked > 0}
              delay={0.4}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="size-4" />
              My Priorities
            </CardTitle>
            <CardDescription>Assigned work ordered by urgency and due date.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {parsedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assigned tasks.</p>
            ) : (
              parsedTasks
                .slice(0, 5)
                .map((task, index) => (
                  <AnimatedTaskCard key={task.id} task={task} delay={index * 0.08} />
                ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers3 className="size-4" />
              Workflow Run Status
            </CardTitle>
            <CardDescription>Distribution of active workflow runs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <AnimatedWorkflowLane
              label="Active"
              count={lanes.active}
              total={totalWorkflows}
              className="bg-blue-500/80"
              delay={0}
            />
            <AnimatedWorkflowLane
              label="Blocked"
              count={lanes.blocked}
              total={totalWorkflows}
              className="bg-red-500/80"
              delay={0.15}
            />
            <AnimatedWorkflowLane
              label="Completed"
              count={lanes.completed}
              total={totalWorkflows}
              className="bg-emerald-500/80"
              delay={0.3}
            />
            <AnimatedBadgeGroup statuses={topStatuses} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Workflow className="size-4" />
              Recent Workflow Runs
            </CardTitle>
            <CardDescription>Most recently started workflow runs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentWorkflows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No workflow runs started yet.</p>
            ) : (
              recentWorkflows
                .slice(0, 3)
                .map((workflow, index) => (
                  <AnimatedWorkflowCard key={workflow.id} workflow={workflow} delay={index * 0.07} />
                ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4" />
              Workflow Runs Needing Attention
            </CardTitle>
            <CardDescription>Runs with blocked, pending, or in-review status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {attentionWorkflows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No workflow runs currently flagged for attention.
              </p>
            ) : (
              attentionWorkflows
                .slice(0, 6)
                .map((workflow, index) => (
                  <AnimatedWorkflowCard key={workflow.id} workflow={workflow} delay={index * 0.07} />
                ))
            )}
          </CardContent>
        </Card>

        <DashboardRecentActivityCard activities={recentActivity} />
      </section>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Dashboard" }]} />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </>
  )
}
