import { Suspense } from "react"
import { Users, FileText, CheckSquare, TrendingUp } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/layout/page-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { dashboardStats, getRecentActivities } from "@/lib/data/activity"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { UserPlus, FileUp, ListTodo } from "lucide-react"

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}

function ActivitySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Async component for stats - ready for real API integration
async function DashboardStats() {
  // When adding real APIs, this becomes: const stats = await fetchDashboardStats()
  const stats = dashboardStats

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Contacts"
        value={stats.totalContacts}
        description="from last month"
        icon={Users}
        trend={{ value: 12, isPositive: true }}
      />
      <StatCard
        title="Active Workflows"
        value={stats.activeWorkflows}
        description="in pipeline"
        icon={FileText}
        trend={{ value: 8, isPositive: true }}
      />
      <StatCard
        title="Pending Tasks"
        value={stats.pendingTasks}
        description="need attention"
        icon={CheckSquare}
      />
      <StatCard
        title="Completed This Week"
        value={stats.completedTasksThisWeek}
        description="tasks finished"
        icon={TrendingUp}
        trend={{ value: 25, isPositive: true }}
      />
    </div>
  )
}

// Async component for activity feed - ready for real API integration
async function DashboardActivity() {
  // When adding real APIs, this becomes: const activities = await fetchRecentActivities(6)
  const activities = getRecentActivities(6)

  return <RecentActivity activities={activities} />
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Dashboard" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Suspense
          fallback={
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <DashboardStats />
        </Suspense>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <Suspense fallback={<ActivitySkeleton />}>
              <DashboardActivity />
            </Suspense>
          </div>
          <div className="lg:col-span-3">
            <QuickActions />
          </div>
        </div>
      </div>
    </>
  )
}

function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks to get you started</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Button variant="outline" className="justify-start" asChild>
          <Link href="/people">
            <UserPlus className="mr-2 size-4" />
            Add New Contact
          </Link>
        </Button>
        <Button variant="outline" className="justify-start" asChild>
          <Link href="/my-work">
            <FileUp className="mr-2 size-4" />
            View My Work
          </Link>
        </Button>
        <Button variant="outline" className="justify-start" asChild>
          <Link href="/calendar">
            <ListTodo className="mr-2 size-4" />
            Check Calendar
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
