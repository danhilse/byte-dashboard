import { notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { User, Calendar, DollarSign, AlertCircle, FileText } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { DetailHeader } from "@/components/detail/detail-header"
import { ActivityFeed } from "@/components/detail/activity-feed"
import { NotesSection } from "@/components/detail/notes-section"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getApplicationById } from "@/lib/data/applications"
import { getContactById } from "@/lib/data/contacts"
import { getActivitiesByEntity, getNotesByEntity } from "@/lib/data/activity"

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>
}

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  submitted: "secondary",
  under_review: "default",
  approved: "default",
  rejected: "destructive",
}

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
}

const priorityVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  low: "outline",
  medium: "secondary",
  high: "destructive",
}

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const { id } = await params
  const application = getApplicationById(id)

  if (!application) {
    notFound()
  }

  const contact = getContactById(application.contactId)
  const activities = getActivitiesByEntity("application", id)
  const notes = getNotesByEntity("application", id)

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Applications", href: "/applications" },
          { label: application.title },
        ]}
      />
      <div className="flex flex-1 flex-col gap-6 p-4">
        <DetailHeader
          title={application.title}
          subtitle={`Contact: ${application.contactName}`}
          badge={{
            label: statusLabels[application.status],
            variant: statusVariants[application.status],
          }}
          actions={
            <Button>
              <FileText className="mr-2 size-4" />
              Update Status
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
                  <CardTitle>Application Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Value</p>
                      <p className="text-sm text-muted-foreground">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          minimumFractionDigits: 0,
                        }).format(application.value)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <AlertCircle className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Priority</p>
                      <Badge variant={priorityVariants[application.priority]}>
                        {application.priority.charAt(0).toUpperCase() + application.priority.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Submitted</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(application.submittedAt), "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Last Updated</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(application.updatedAt), "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  {application.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-1">Internal Notes</p>
                      <p className="text-sm text-muted-foreground">{application.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {contact ? (
                    <Link
                      href={`/people/${contact.id}`}
                      className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted"
                    >
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="size-5" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{contact.role}</p>
                        <p className="text-sm text-muted-foreground">{contact.company}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{contact.email}</p>
                        <p className="text-sm text-muted-foreground">{contact.phone}</p>
                      </div>
                    </Link>
                  ) : (
                    <p className="text-sm text-muted-foreground">Contact not found.</p>
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
