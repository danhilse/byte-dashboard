export interface TaskCompletedSignal {
  taskId: string
  completedBy: string
}

export interface ApprovalSignal {
  outcome: "approved" | "rejected"
  comment?: string
  approvedBy: string
}

export const TASK_COMPLETED_SIGNAL_NAME = "taskCompleted"
export const APPROVAL_SUBMITTED_SIGNAL_NAME = "approvalSubmitted"
