import { PageHeader } from "@/components/layout/page-header"
import { DataTable } from "@/components/data-table/data-table"
import { applicationColumns, applicationStatusOptions } from "@/components/data-table/columns/application-columns"
import { applications } from "@/lib/data/applications"

export default function ApplicationsPage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Applications" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
            <p className="text-muted-foreground">
              Track and manage applications in your pipeline.
            </p>
          </div>
        </div>
        <DataTable
          columns={applicationColumns}
          data={applications}
          searchKey="title"
          searchPlaceholder="Search applications..."
          filterColumn="status"
          filterOptions={applicationStatusOptions}
        />
      </div>
    </>
  )
}
