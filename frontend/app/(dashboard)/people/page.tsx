import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { PeopleContent } from "./people-content"

function PeopleContentSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-40" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-14" />
      </div>
      <Skeleton className="h-[500px] rounded-md" />
    </div>
  )
}

export default function PeoplePage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "People" }]} />
      <Suspense fallback={<PeopleContentSkeleton />}>
        <PeopleContent />
      </Suspense>
    </>
  )
}
