/**
 * Applicant Review Workflow (Hardcoded)
 *
 * This is a Phase 2 prototype workflow that validates the architecture.
 * It demonstrates:
 * - Task creation from workflow
 * - Waiting for external signals (task completion, approval)
 * - Conditional branching
 * - Status updates through Temporal activities
 * - Long-running execution patterns
 *
 * Flow:
 * 1. Create contact if needed
 * 2. Assign "Review Application" task to reviewer role
 * 3. Wait for task completion signal (with timeout)
 * 4. Wait for approval signal (approve/reject with comment)
 * 5. Branch on approval outcome
 *    - If approved → set status to "approved" → send welcome email
 *    - If rejected → set status to "rejected" → send rejection email
 */

import {
  proxyActivities,
  defineSignal,
  setHandler,
  condition,
  sleep,
} from "@temporalio/workflow";
import type * as activities from "../activities";

// Create activity proxies with appropriate timeouts
const {
  createTask,
  setWorkflowStatus,
  setWorkflowProgress,
  sendWelcomeEmail,
  sendRejectionEmail,
  getTask,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "2 minutes",
  retry: {
    maximumAttempts: 3,
  },
});

/**
 * Workflow Input
 */
export interface ApplicantReviewWorkflowInput {
  workflowId: string; // Workflow execution ID from DB
  orgId: string;
  contactId: string;
  contactEmail: string;
  contactFirstName: string;
}

/**
 * Workflow Result
 */
export interface ApplicantReviewWorkflowResult {
  workflowId: string;
  finalStatus: "approved" | "rejected" | "timeout";
  outcome?: string;
  outcomeComment?: string;
}

/**
 * Task Completion Signal
 * Sent when a task is marked as done
 */
export interface TaskCompletedSignal {
  taskId: string;
  completedBy: string;
}

/**
 * Approval Signal
 * Sent when an approver makes a decision
 */
export interface ApprovalSignal {
  outcome: "approved" | "rejected";
  comment?: string;
  approvedBy: string;
}

// Define signals
export const taskCompletedSignal = defineSignal<[TaskCompletedSignal]>("taskCompleted");
export const approvalSubmittedSignal = defineSignal<[ApprovalSignal]>("approvalSubmitted");

/**
 * Applicant Review Workflow
 */
export async function applicantReviewWorkflow(
  input: ApplicantReviewWorkflowInput
): Promise<ApplicantReviewWorkflowResult> {
  console.log(`[Workflow] Starting applicant review for contact ${input.contactId}`);

  // State for signals
  let taskCompleted = false;
  let taskCompletionData: TaskCompletedSignal | undefined;
  let approvalReceived = false;
  let approvalData: ApprovalSignal | undefined;

  // Set up signal handlers
  setHandler(taskCompletedSignal, (data: TaskCompletedSignal) => {
    console.log(`[Workflow] Received taskCompleted signal for task ${data.taskId}`);
    taskCompleted = true;
    taskCompletionData = data;
  });

  setHandler(approvalSubmittedSignal, (data: ApprovalSignal) => {
    console.log(`[Workflow] Received approvalSubmitted signal: ${data.outcome}`);
    approvalReceived = true;
    approvalData = data;
  });

  // Step 1: Set initial status
  await setWorkflowStatus(input.workflowId, "in_review");
  await setWorkflowProgress(input.workflowId, "step-1-review");

  // Step 2: Create "Review Application" task
  console.log(`[Workflow] Creating review task`);
  const reviewTaskId = await createTask(input.workflowId, {
    orgId: input.orgId,
    contactId: input.contactId,
    title: `Review Application - ${input.contactFirstName}`,
    description: `Review the application for ${input.contactFirstName}. Complete the task when review is done.`,
    taskType: "standard",
    assignedRole: "reviewer", // Role-based assignment
    priority: "high",
    createdByStepId: "step-2-create-review-task",
  });
  console.log(`[Workflow] Review task created: ${reviewTaskId}`);

  // Step 3: Wait for task completion (with 7-day timeout)
  console.log(`[Workflow] Waiting for review task completion...`);
  const reviewCompleted = await condition(() => taskCompleted, "7 days");

  if (!reviewCompleted) {
    console.log(`[Workflow] Review task timed out after 7 days`);
    await setWorkflowStatus(input.workflowId, "timeout");
    return {
      workflowId: input.workflowId,
      finalStatus: "timeout",
    };
  }

  console.log(`[Workflow] Review task completed by ${taskCompletionData?.completedBy}`);

  // Step 4: Create "Manager Approval" task
  await setWorkflowProgress(input.workflowId, "step-4-approval");
  console.log(`[Workflow] Creating approval task`);
  const approvalTaskId = await createTask(input.workflowId, {
    orgId: input.orgId,
    contactId: input.contactId,
    title: `Approval Required - ${input.contactFirstName}`,
    description: `Approve or reject the application for ${input.contactFirstName}. Provide a comment with your decision.`,
    taskType: "approval",
    assignedRole: "manager", // Role-based assignment
    priority: "high",
    createdByStepId: "step-4-create-approval-task",
  });
  console.log(`[Workflow] Approval task created: ${approvalTaskId}`);

  // Step 5: Wait for approval signal (with 7-day timeout)
  console.log(`[Workflow] Waiting for approval decision...`);
  const approvalSubmitted = await condition(() => approvalReceived, "7 days");

  if (!approvalSubmitted || !approvalData) {
    console.log(`[Workflow] Approval timed out after 7 days`);
    await setWorkflowStatus(input.workflowId, "timeout");
    return {
      workflowId: input.workflowId,
      finalStatus: "timeout",
    };
  }

  console.log(`[Workflow] Approval received: ${approvalData.outcome} by ${approvalData.approvedBy}`);

  // Step 6: Branch based on approval outcome
  if (approvalData.outcome === "approved") {
    // Approval path
    console.log(`[Workflow] Application APPROVED`);
    await setWorkflowProgress(input.workflowId, "step-6-approved");
    await setWorkflowStatus(input.workflowId, "approved");

    // Send welcome email
    console.log(`[Workflow] Sending welcome email to ${input.contactEmail}`);
    await sendWelcomeEmail(input.contactEmail, input.contactFirstName);

    return {
      workflowId: input.workflowId,
      finalStatus: "approved",
      outcome: "approved",
      outcomeComment: approvalData.comment,
    };
  } else {
    // Rejection path
    console.log(`[Workflow] Application REJECTED`);
    await setWorkflowProgress(input.workflowId, "step-8-rejected");
    await setWorkflowStatus(input.workflowId, "rejected");

    // Send rejection email
    console.log(`[Workflow] Sending rejection email to ${input.contactEmail}`);
    await sendRejectionEmail(
      input.contactEmail,
      input.contactFirstName,
      approvalData.comment
    );

    return {
      workflowId: input.workflowId,
      finalStatus: "rejected",
      outcome: "rejected",
      outcomeComment: approvalData.comment,
    };
  }
}
