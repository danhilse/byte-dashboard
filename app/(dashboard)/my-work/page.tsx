import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { MyWorkContent } from "./my-work-content"

function MyWorkSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-64" />
      </div>
      <Skeleton className="h-10 w-48" />
      <div className="grid h-[calc(100vh-16rem)] auto-cols-fr grid-flow-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export default function MyWorkPage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "My Work" }]} />
      <Suspense fallback={<MyWorkSkeleton />}>
        <MyWorkContent />
      </Suspense>
    </>
  )
}
