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

// ===========================
// Workflow Phases (Display-Only Grouping)
// ===========================

export interface WorkflowPhase {
  id: string
  label: string
}

// ===========================
// Workflow Step Types (Discriminated Union)
// ===========================

export type StepType =
  | "trigger"
  | "assign_task"
  | "wait_for_task"
  | "wait_for_approval"
  | "update_status"
  | "condition"
  | "send_email"
  | "delay"
  | "update_contact"
  | "update_task"

interface BaseStep {
  id: string
  type: StepType
  label: string
  phaseId?: string
}

export interface TriggerStep extends BaseStep {
  type: "trigger"
  config: {
    triggerType: "manual" | "form_submission"
  }
}

export interface AssignTaskStep extends BaseStep {
  type: "assign_task"
  config: {
    title: string
    description?: string
    taskType: TaskType
    assignTo: { type: "role"; role: string } | { type: "user"; userId: string }
    priority: TaskPriority
    dueDays?: number
  }
}

export interface WaitForTaskStep extends BaseStep {
  type: "wait_for_task"
  config: {
    timeoutDays: number
  }
}

export interface WaitForApprovalStep extends BaseStep {
  type: "wait_for_approval"
  config: {
    timeoutDays: number
    requireComment?: boolean
  }
}

export interface UpdateStatusStep extends BaseStep {
  type: "update_status"
  config: {
    status: WorkflowStatus
  }
}

export interface ConditionStep extends BaseStep {
  type: "condition"
  config: {
    field: string
    branches: { value: string; gotoStepId: string }[]
    defaultGotoStepId?: string
  }
}

export interface SendEmailStep extends BaseStep {
  type: "send_email"
  config: {
    to: string
    subject: string
    body: string
  }
}

export interface DelayStep extends BaseStep {
  type: "delay"
  config: {
    duration: number
    unit: "hours" | "days"
  }
}

export interface UpdateContactStep extends BaseStep {
  type: "update_contact"
  config: {
    fields: { field: string; value: string }[]
  }
}

export interface UpdateTaskStep extends BaseStep {
  type: "update_task"
  config: {
    taskStepId: string
    fields: { field: string; value: string }[]
  }
}

export type WorkflowStep =
  | TriggerStep
  | AssignTaskStep
  | WaitForTaskStep
  | WaitForApprovalStep
  | UpdateStatusStep
  | ConditionStep
  | SendEmailStep
  | DelayStep
  | UpdateContactStep
  | UpdateTaskStep

// ===========================
// Workflow Definition
// ===========================

export interface WorkflowDefinition {
  id: string
  orgId: string
  name: string
  description?: string
  version: number
  phases: WorkflowPhase[]
  steps: { steps: WorkflowStep[] } // JSONB array of step definitions
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
  definitionName?: string // Joined from workflow_definitions
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
}

export type TaskStatus = "backlog" | "todo" | "in_progress" | "done"
export type TaskPriority = "low" | "medium" | "high" | "urgent"
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
  updatedAt?: string
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

export interface ActivityLogRow {
  id: string
  entityType: "workflow" | "contact" | "task"
  entityId: string
  action: string
  details: Record<string, unknown>
  createdAt: string
  userId: string | null
  userName: string
}
