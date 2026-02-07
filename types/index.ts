export type ContactStatus = "active" | "inactive" | "lead"

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
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  zip?: string
  workflowsCount?: number
}

export type WorkflowStatus = "draft" | "in_review" | "pending" | "on_hold" | "approved" | "rejected" | "running" | "completed" | "failed" | "timeout"

export interface WorkflowDefinition {
  id: string
  orgId: string
  name: string
  description?: string
  version: number
  phases: unknown[] // JSONB array of phase definitions
  steps: { steps: unknown[] } // JSONB array of step definitions
  variables: Record<string, unknown> // JSONB variable definitions
  statuses: unknown[] // JSONB UI status definitions
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Workflow {
  id: string
  orgId: string
  contactId: string
  contactName?: string // Joined from contact
  contactAvatarUrl?: string // Joined from contact
  workflowDefinitionId?: string
  definitionVersion?: number // Snapshot of definition version at execution time
  currentStepId?: string
  currentPhaseId?: string
  status: WorkflowStatus
  updatedByTemporal: boolean // Flag to prevent race conditions
  source: "manual" | "formstack" | "api"
  sourceId?: string
  startedAt: string
  completedAt?: string
  temporalWorkflowId?: string
  temporalRunId?: string
  variables: Record<string, unknown>
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
  /** @deprecated Legacy mock data field. Remove during Phase 3 CRUD rewrite. */
  title?: string
  /** @deprecated Legacy mock data field. Remove during Phase 3 CRUD rewrite. */
  value?: number
  /** @deprecated Legacy mock data field. Remove during Phase 3 CRUD rewrite. */
  priority?: "low" | "medium" | "high"
  /** @deprecated Legacy mock data field. Remove during Phase 3 CRUD rewrite. */
  notes?: string
  /** @deprecated Legacy mock data field. Remove during Phase 3 CRUD rewrite. */
  templateId?: string
  /** @deprecated Legacy mock data field. Remove during Phase 3 CRUD rewrite. */
  templateName?: string
  /** @deprecated Legacy mock data field. Remove during Phase 3 CRUD rewrite. */
  progress?: number
  /** @deprecated Legacy mock data field. Remove during Phase 3 CRUD rewrite. */
  taskCount?: number
  /** @deprecated Legacy mock data field. Remove during Phase 3 CRUD rewrite. */
  completedTaskCount?: number
}

export type TaskStatus = "backlog" | "todo" | "in_progress" | "done"
export type TaskPriority = "low" | "medium" | "high" | "urgent"
export type TaskSource = "manual" | "workflow"
export type TaskType = "standard" | "approval"
export type TaskOutcome = "approved" | "rejected" | "completed" | null

export interface Task {
  id: string
  orgId: string
  workflowId?: string
  contactId?: string
  assignedTo?: string // Specific user if claimed
  assignedRole?: string // Role if role-based assignment
  title: string
  description?: string
  taskType: TaskType
  status: TaskStatus
  priority: TaskPriority
  outcome?: TaskOutcome
  outcomeComment?: string // Comment from approver
  position: number // For drag-and-drop ordering
  dueDate?: string
  completedAt?: string
  createdByStepId?: string // Which workflow step created this task
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
  /** @deprecated Use `assignedTo` instead. Remove during Phase 4 CRUD rewrite. */
  assignee?: string
  /** @deprecated Tasks don't have tags in the DB schema. Remove during Phase 4 CRUD rewrite. */
  tags?: string[]
  /** @deprecated Use `taskType` or check `workflowId` instead. Remove during Phase 4 CRUD rewrite. */
  source?: TaskSource
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
