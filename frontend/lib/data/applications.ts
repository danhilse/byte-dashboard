import type { Application } from "@/types"

export const applications: Application[] = [
  {
    id: "a1",
    title: "Enterprise License Agreement",
    contactId: "c1",
    contactName: "Sarah Chen",
    status: "under_review",
    submittedAt: "2024-01-28T10:00:00Z",
    updatedAt: "2024-02-01T09:00:00Z",
    value: 125000,
    priority: "high",
    notes: "Needs legal review before approval",
  },
  {
    id: "a2",
    title: "Startup Partnership Proposal",
    contactId: "c2",
    contactName: "Michael Rodriguez",
    status: "submitted",
    submittedAt: "2024-02-01T15:30:00Z",
    updatedAt: "2024-02-01T15:30:00Z",
    value: 45000,
    priority: "medium",
  },
  {
    id: "a3",
    title: "Product Integration Request",
    contactId: "c3",
    contactName: "Emily Watson",
    status: "draft",
    submittedAt: "2024-01-25T16:00:00Z",
    updatedAt: "2024-01-30T11:00:00Z",
    value: 78000,
    priority: "low",
  },
  {
    id: "a4",
    title: "Annual Subscription Renewal",
    contactId: "c4",
    contactName: "James Park",
    status: "approved",
    submittedAt: "2024-01-15T08:00:00Z",
    updatedAt: "2024-01-22T14:00:00Z",
    value: 96000,
    priority: "high",
  },
  {
    id: "a5",
    title: "Custom Development Project",
    contactId: "c7",
    contactName: "Amanda Foster",
    status: "under_review",
    submittedAt: "2024-01-20T10:00:00Z",
    updatedAt: "2024-01-29T16:00:00Z",
    value: 250000,
    priority: "high",
    notes: "Requires technical assessment",
  },
  {
    id: "a6",
    title: "Trial Extension Request",
    contactId: "c6",
    contactName: "David Kim",
    status: "submitted",
    submittedAt: "2024-02-02T09:00:00Z",
    updatedAt: "2024-02-02T09:00:00Z",
    value: 0,
    priority: "low",
  },
  {
    id: "a7",
    title: "Enterprise Support Upgrade",
    contactId: "c8",
    contactName: "Robert Martinez",
    status: "approved",
    submittedAt: "2024-01-18T11:30:00Z",
    updatedAt: "2024-01-25T10:00:00Z",
    value: 35000,
    priority: "medium",
  },
  {
    id: "a8",
    title: "Multi-year Contract Proposal",
    contactId: "c5",
    contactName: "Lisa Thompson",
    status: "rejected",
    submittedAt: "2023-12-10T09:00:00Z",
    updatedAt: "2024-01-10T14:00:00Z",
    value: 180000,
    priority: "medium",
    notes: "Client decided to go with competitor",
  },
]

export function getApplicationById(id: string): Application | undefined {
  return applications.find((a) => a.id === id)
}

export function getApplicationsByStatus(status: Application["status"]): Application[] {
  return applications.filter((a) => a.status === status)
}

export function getApplicationsByContact(contactId: string): Application[] {
  return applications.filter((a) => a.contactId === contactId)
}
