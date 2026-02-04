import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { ApplicationsContent } from "./applications-content"
import { Skeleton } from "@/components/ui/skeleton"

function ApplicationsLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-48" />
        </div>
      </div>
      <Skeleton className="h-8 w-96" />
      <div className="grid h-[calc(100vh-14rem)] grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export default function ApplicationsPage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Applications" }]} />
      <Suspense fallback={<ApplicationsLoading />}>
        <ApplicationsContent />
      </Suspense>
    </>
  )
}
