import { notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { Mail, Phone, Building, Briefcase, Calendar } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { DetailHeader } from "@/components/detail/detail-header"
import { ActivityFeed } from "@/components/detail/activity-feed"
import { NotesSection } from "@/components/detail/notes-section"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getContactById } from "@/lib/data/contacts"
import { getApplicationsByContact } from "@/lib/data/applications"
import { getActivitiesByEntity, getNotesByEntity } from "@/lib/data/activity"

interface ContactDetailPageProps {
  params: Promise<{ id: string }>
}

const statusVariants: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  inactive: "secondary",
  lead: "outline",
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
  const initials = `${contact.firstName[0]}${contact.lastName[0]}`

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "People", href: "/people" },
          { label: `${contact.firstName} ${contact.lastName}` },
        ]}
      />
      <div className="flex flex-1 flex-col gap-6 p-4">
        <DetailHeader
          title={`${contact.firstName} ${contact.lastName}`}
          subtitle={`${contact.role} at ${contact.company}`}
          avatarText={initials}
          badge={{
            label: contact.status.charAt(0).toUpperCase() + contact.status.slice(1),
            variant: statusVariants[contact.status],
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
                  <div className="flex items-center gap-3">
                    <Mail className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <a href={`mailto:${contact.email}`} className="text-sm text-muted-foreground hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{contact.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Company</p>
                      <p className="text-sm text-muted-foreground">{contact.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Briefcase className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Role</p>
                      <p className="text-sm text-muted-foreground">{contact.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Added</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(contact.createdAt), "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
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
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              minimumFractionDigits: 0,
                            }).format(app.value)}
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
