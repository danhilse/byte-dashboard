import { Suspense } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"

import { TasksContent } from "./tasks-content"

export default function TasksPage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Tasks" }]} />
      <Suspense fallback={<TasksPageSkeleton />}>
        <TasksContent />
      </Suspense>
    </>
  )
}

function TasksPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-96" />
        ))}
      </div>
    </div>
  )
}
