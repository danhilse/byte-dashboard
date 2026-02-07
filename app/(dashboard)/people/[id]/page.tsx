import { notFound } from "next/navigation"
import { format } from "date-fns"
import { Mail, Phone, Building, Briefcase, Calendar, MapPin } from "lucide-react"
import { auth } from "@clerk/nextjs/server"

import { PageHeader } from "@/components/layout/page-header"
import { DetailHeader } from "@/components/detail/detail-header"
import { InfoField } from "@/components/common/info-field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/db"
import { contacts, workflows } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { contactStatusConfig } from "@/lib/status-config"
import { getInitials } from "@/lib/utils"
import type { ContactStatus } from "@/types"

interface ContactDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { userId, orgId } = await auth()
  const { id } = await params

  if (!userId || !orgId) {
    notFound()
  }

  // Fetch contact from database
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.orgId, orgId)))

  if (!contact) {
    notFound()
  }

  // Fetch related workflows
  const relatedWorkflows = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.contactId, id), eq(workflows.orgId, orgId)))

  const fullName = `${contact.firstName} ${contact.lastName}`
  const statusConfig = contactStatusConfig[contact.status as ContactStatus] || contactStatusConfig.active

  // Format address
  const addressParts = [
    contact.addressLine1,
    contact.addressLine2,
    [contact.city, contact.state].filter(Boolean).join(", "),
    contact.zip,
  ].filter(Boolean)
  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : null

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
          subtitle={contact.role && contact.company ? `${contact.role} at ${contact.company}` : contact.company || contact.role || "No company or role"}
          avatarText={getInitials(fullName)}
          avatarUrl={contact.avatarUrl || undefined}
          badge={{
            label: statusConfig.label,
            variant: statusConfig.variant,
          }}
          actions={
            contact.email ? (
              <Button asChild>
                <a href={`mailto:${contact.email}`}>
                  <Mail className="mr-2 size-4" />
                  Send Email
                </a>
              </Button>
            ) : null
          }
        />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="workflows">
              Workflows
              {relatedWorkflows.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {relatedWorkflows.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contact.email && (
                    <InfoField
                      icon={Mail}
                      label="Email"
                      value={contact.email}
                      href={`mailto:${contact.email}`}
                    />
                  )}
                  {contact.phone && (
                    <InfoField
                      icon={Phone}
                      label="Phone"
                      value={contact.phone}
                      href={`tel:${contact.phone}`}
                    />
                  )}
                  {contact.company && (
                    <InfoField icon={Building} label="Company" value={contact.company} />
                  )}
                  {contact.role && (
                    <InfoField icon={Briefcase} label="Role" value={contact.role} />
                  )}
                  {fullAddress && (
                    <InfoField icon={MapPin} label="Address" value={fullAddress} />
                  )}
                  <InfoField
                    icon={Calendar}
                    label="Added"
                    value={format(new Date(contact.createdAt), "MMMM d, yyyy")}
                  />
                  {contact.lastContactedAt && (
                    <InfoField
                      icon={Calendar}
                      label="Last Contacted"
                      value={format(new Date(contact.lastContactedAt), "MMMM d, yyyy")}
                    />
                  )}
                </CardContent>
              </Card>

              {contact.tags && contact.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {contact.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="workflows">
            <Card>
              <CardHeader>
                <CardTitle>Related Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                {relatedWorkflows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No workflows yet.</p>
                ) : (
                  <div className="space-y-3">
                    {relatedWorkflows.map((workflow) => (
                      <div
                        key={workflow.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Workflow {workflow.id.slice(0, 8)}</span>
                            <Badge variant="outline">
                              {workflow.status}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Started {format(new Date(workflow.startedAt), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
