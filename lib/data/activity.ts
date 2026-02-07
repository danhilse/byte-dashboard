import type { Activity, Note, DashboardStats } from "@/types"

export const activities: Activity[] = [
  {
    id: "act1",
    type: "workflow_submitted",
    entityType: "workflow",
    entityId: "a6",
    entityName: "Trial Extension Request",
    description: "David Kim submitted a trial extension request",
    createdAt: "2024-02-02T09:00:00Z",
    userId: "u1",
    userName: "System",
  },
  {
    id: "act2",
    type: "task_completed",
    entityType: "task",
    entityId: "t5",
    entityName: "Update CRM integration docs",
    description: "Chris Davis completed the documentation task",
    createdAt: "2024-01-28T16:00:00Z",
    userId: "u3",
    userName: "Chris Davis",
  },
  {
    id: "act3",
    type: "status_changed",
    entityType: "workflow",
    entityId: "a4",
    entityName: "Annual Subscription Renewal",
    description: "Workflow status changed to approved",
    createdAt: "2024-01-22T14:00:00Z",
    userId: "u2",
    userName: "Sarah Miller",
  },
  {
    id: "act4",
    type: "contact_created",
    entityType: "contact",
    entityId: "c6",
    entityName: "David Kim",
    description: "New lead added from Startup Labs",
    createdAt: "2024-02-01T14:30:00Z",
    userId: "u1",
    userName: "Alex Johnson",
  },
  {
    id: "act5",
    type: "note_added",
    entityType: "workflow",
    entityId: "a1",
    entityName: "Enterprise License Agreement",
    description: "Added note about legal review requirements",
    createdAt: "2024-01-31T11:00:00Z",
    userId: "u2",
    userName: "Sarah Miller",
  },
  {
    id: "act6",
    type: "task_completed",
    entityType: "task",
    entityId: "t6",
    entityName: "Send contract to Innovate Co",
    description: "Contract sent and acknowledged",
    createdAt: "2024-01-22T11:00:00Z",
    userId: "u2",
    userName: "Sarah Miller",
  },
  {
    id: "act7",
    type: "status_changed",
    entityType: "workflow",
    entityId: "a8",
    entityName: "Multi-year Contract Proposal",
    description: "Workflow status changed to rejected",
    createdAt: "2024-01-10T14:00:00Z",
    userId: "u1",
    userName: "Alex Johnson",
  },
  {
    id: "act8",
    type: "contact_created",
    entityType: "contact",
    entityId: "c8",
    entityName: "Robert Martinez",
    description: "New contact from CloudTech Solutions",
    createdAt: "2024-01-12T09:30:00Z",
    userId: "u1",
    userName: "Alex Johnson",
  },
]

export const notes: Note[] = [
  {
    id: "n1",
    entityType: "contact",
    entityId: "c1",
    content: "Sarah mentioned they're looking to expand their engineering team in Q2. Good opportunity for additional licenses.",
    createdAt: "2024-01-30T10:00:00Z",
    updatedAt: "2024-01-30T10:00:00Z",
    userId: "u1",
    userName: "Alex Johnson",
  },
  {
    id: "n2",
    entityType: "workflow",
    entityId: "a1",
    content: "Legal team reviewing the custom SLA terms. Expected response by end of week.",
    createdAt: "2024-01-31T11:00:00Z",
    updatedAt: "2024-01-31T11:00:00Z",
    userId: "u2",
    userName: "Sarah Miller",
  },
  {
    id: "n3",
    entityType: "contact",
    entityId: "c2",
    content: "Michael prefers communication via email. Best time to reach is mornings PST.",
    createdAt: "2024-01-22T09:00:00Z",
    updatedAt: "2024-01-22T09:00:00Z",
    userId: "u2",
    userName: "Sarah Miller",
  },
  {
    id: "n4",
    entityType: "workflow",
    entityId: "a5",
    content: "Technical requirements document received. Chris is reviewing for feasibility.",
    createdAt: "2024-01-29T14:00:00Z",
    updatedAt: "2024-01-29T14:00:00Z",
    userId: "u3",
    userName: "Chris Davis",
  },
]

export const dashboardStats: DashboardStats = {
  totalContacts: 8,
  activeWorkflows: 5,
  pendingTasks: 4,
  completedTasksThisWeek: 2,
}

export function getActivitiesByEntity(entityType: Activity["entityType"], entityId: string): Activity[] {
  return activities.filter((a) => a.entityType === entityType && a.entityId === entityId)
}

export function getNotesByEntity(entityType: Note["entityType"], entityId: string): Note[] {
  return notes.filter((n) => n.entityType === entityType && n.entityId === entityId)
}

export function getRecentActivities(limit: number = 10): Activity[] {
  return [...activities]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}
