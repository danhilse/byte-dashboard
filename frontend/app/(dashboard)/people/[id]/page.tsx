import { notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { Mail, Phone, Building, Briefcase, Calendar } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { DetailHeader } from "@/components/detail/detail-header"
import { ActivityFeed } from "@/components/detail/activity-feed"
import { NotesSection } from "@/components/detail/notes-section"
import { InfoField } from "@/components/common/info-field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getContactById } from "@/lib/data/contacts"
import { getApplicationsByContact } from "@/lib/data/applications"
import { getActivitiesByEntity, getNotesByEntity } from "@/lib/data/activity"
import { contactStatusConfig } from "@/lib/status-config"
import { getInitials, formatCurrency } from "@/lib/utils"
import type { ContactStatus } from "@/types"

interface ContactDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = await params
  const contact = getContactById(id)

  if (!contact) {
    notFound()
  }

  const applications = getApplicationsByContact(id)
  const activities = getActivitiesByEntity("contact", id)
  const notes = getNotesByEntity("contact", id)
  const fullName = `${contact.firstName} ${contact.lastName}`
  const statusConfig = contactStatusConfig[contact.status as ContactStatus]

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "People", href: "/people" },
          { label: fullName },
        ]}
      />
      <div className="flex flex-1 flex-col gap-6 p-4">
        <DetailHeader
          title={fullName}
          subtitle={`${contact.role} at ${contact.company}`}
          avatarText={getInitials(fullName)}
          badge={{
            label: statusConfig.label,
            variant: statusConfig.variant,
          }}
          actions={
            <Button>
              <Mail className="mr-2 size-4" />
              Send Email
            </Button>
          }
        />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoField
                    icon={Mail}
                    label="Email"
                    value={contact.email}
                    href={`mailto:${contact.email}`}
                  />
                  <InfoField icon={Phone} label="Phone" value={contact.phone} />
                  <InfoField icon={Building} label="Company" value={contact.company} />
                  <InfoField icon={Briefcase} label="Role" value={contact.role} />
                  <InfoField
                    icon={Calendar}
                    label="Added"
                    value={format(new Date(contact.createdAt), "MMMM d, yyyy")}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Related Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  {applications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No applications yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {applications.map((app) => (
                        <Link
                          key={app.id}
                          href={`/applications/${app.id}`}
                          className="block rounded-lg border p-3 transition-colors hover:bg-muted"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{app.title}</span>
                            <Badge variant="outline">
                              {app.status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatCurrency(app.value)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notes">
            <NotesSection notes={notes} />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityFeed activities={activities} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
