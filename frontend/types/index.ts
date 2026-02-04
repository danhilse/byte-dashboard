export type ContactStatus = "active" | "inactive" | "lead"

export interface ContactAddress {
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
}

export interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  company: string
  role: string
  status: ContactStatus
  createdAt: string
  lastContactedAt: string
  avatarUrl?: string
  tags?: string[]
  address?: ContactAddress
  applicationsCount?: number
}

export type ApplicationStatus = "draft" | "in_review" | "pending" | "on_hold" | "approved" | "rejected"

export interface Application {
  id: string
  title: string
  contactId: string
  contactName: string
  contactAvatarUrl?: string
  status: ApplicationStatus
  submittedAt: string
  updatedAt: string
  value: number
  priority: "low" | "medium" | "high"
  notes?: string
  workflowId?: string
  workflowName?: string
  progress?: number
  taskCount?: number
  completedTaskCount?: number
}

export type TaskStatus = "backlog" | "todo" | "in_progress" | "done"
export type TaskPriority = "low" | "medium" | "high" | "urgent"
export type TaskSource = "manual" | "workflow"

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assignee?: string
  dueDate?: string
  createdAt: string
  updatedAt: string
  tags: string[]
  source: TaskSource
  workflowId?: string
  applicationId?: string
}

export interface Activity {
  id: string
  type: "contact_created" | "application_submitted" | "task_completed" | "note_added" | "status_changed"
  entityType: "contact" | "application" | "task"
  entityId: string
  entityName: string
  description: string
  createdAt: string
  userId: string
  userName: string
}

export interface Note {
  id: string
  entityType: "contact" | "application"
  entityId: string
  content: string
  createdAt: string
  updatedAt: string
  userId: string
  userName: string
}

export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "member" | "viewer"
  avatarUrl?: string
}

export interface DashboardStats {
  totalContacts: number
  activeApplications: number
  pendingTasks: number
  completedTasksThisWeek: number
}
