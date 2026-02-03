import { PageHeader } from "@/components/layout/page-header"
import { DataTable } from "@/components/data-table/data-table"
import { contactColumns, contactStatusOptions } from "@/components/data-table/columns/contact-columns"
import { contacts } from "@/lib/data/contacts"

export default function PeoplePage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "People" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
            <p className="text-muted-foreground">
              Manage your contacts and their information.
            </p>
          </div>
        </div>
        <DataTable
          columns={contactColumns}
          data={contacts}
          searchKey="firstName"
          searchPlaceholder="Search contacts..."
          filterColumn="status"
          filterOptions={contactStatusOptions}
        />
      </div>
    </>
  )
}
