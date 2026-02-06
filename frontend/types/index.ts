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
  workflowsCount?: number
}

export type WorkflowStatus = "draft" | "in_review" | "pending" | "on_hold" | "approved" | "rejected"

export interface Workflow {
  id: string
  title: string
  contactId: string
  contactName: string
  contactAvatarUrl?: string
  status: WorkflowStatus
  submittedAt: string
  updatedAt: string
  value: number
  priority: "low" | "medium" | "high"
  notes?: string
  templateId?: string
  templateName?: string
  progress?: number
  taskCount?: number
  completedTaskCount?: number
}

// Legacy type alias for backward compatibility during migration
export type ApplicationStatus = WorkflowStatus
export type Application = Workflow

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
}

export interface Activity {
  id: string
  type: "contact_created" | "workflow_submitted" | "task_completed" | "note_added" | "status_changed" | "asset_uploaded"
  entityType: "contact" | "workflow" | "task"
  entityId: string
  entityName: string
  description: string
  createdAt: string
  userId: string
  userName: string
}

export interface Note {
  id: string
  entityType: "contact" | "workflow" | "task"
  entityId: string
  content: string
  createdAt: string
  updatedAt: string
  userId: string
  userName: string
}

export interface Asset {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  mimeType: string
  workflowId?: string
  contactId?: string
  taskId?: string
  storageUrl: string
  uploadedBy: string
  uploadedByName: string
  uploadedAt: string
  metadata?: {
    description?: string
    tags?: string[]
    category?: string
  }
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
  activeWorkflows: number
  pendingTasks: number
  completedTasksThisWeek: number
}
