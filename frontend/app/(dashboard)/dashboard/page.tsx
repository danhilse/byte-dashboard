import { Users, FileText, CheckSquare, TrendingUp } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/layout/page-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { dashboardStats, getRecentActivities } from "@/lib/data/activity"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus, FileUp, ListTodo } from "lucide-react"

export default function DashboardPage() {
  const recentActivities = getRecentActivities(6)

  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Dashboard" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Contacts"
            value={dashboardStats.totalContacts}
            description="from last month"
            icon={Users}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Active Applications"
            value={dashboardStats.activeApplications}
            description="in pipeline"
            icon={FileText}
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard
            title="Pending Tasks"
            value={dashboardStats.pendingTasks}
            description="need attention"
            icon={CheckSquare}
          />
          <StatCard
            title="Completed This Week"
            value={dashboardStats.completedTasksThisWeek}
            description="tasks finished"
            icon={TrendingUp}
            trend={{ value: 25, isPositive: true }}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <RecentActivity activities={recentActivities} />
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
