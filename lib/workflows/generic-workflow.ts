/**
 * Generic Workflow Interpreter
 *
 * Reads a workflow definition's steps from the database and executes them
 * sequentially. Supports:
 * - trigger (no-op, already triggered)
 * - assign_task → creates a task via activity
 * - wait_for_task → waits for taskCompleted signal with timeout
 * - wait_for_approval → waits for approvalSubmitted signal with timeout
 * - update_status → updates workflow execution status
 * - condition → branches based on a variable value
 *
 * Reuses the same signal names (taskCompleted, approvalSubmitted) as the
 * hardcoded workflow so existing task API routes signal correctly.
 */

import {
  proxyActivities,
  defineSignal,
  setHandler,
  condition,
} from "@temporalio/workflow";
import type * as activities from "../activities";
import type {
  AssignTaskStep,
  WaitForTaskStep,
  WaitForApprovalStep,
  UpdateStatusStep,
  ConditionStep,
} from "@/types";

const {
  createTask,
  setWorkflowStatus,
  setWorkflowProgress,
  getWorkflowDefinition,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "2 minutes",
  retry: {
    maximumAttempts: 3,
  },
});

// --- Input / Output ---

export interface GenericWorkflowInput {
  workflowId: string;
  orgId: string;
  contactId: string;
  contactEmail: string;
  contactFirstName: string;
  definitionId: string;
}

export interface GenericWorkflowResult {
  workflowId: string;
  finalStatus: string;
  variables: Record<string, string>;
}

// --- Signals (reuse same signal names as hardcoded workflow) ---

type GTaskCompletedPayload = {
  taskId: string;
  completedBy: string;
};

type GApprovalPayload = {
  outcome: "approved" | "rejected";
  comment?: string;
  approvedBy: string;
};

const taskCompletedSignal =
  defineSignal<[GTaskCompletedPayload]>("taskCompleted");
const approvalSubmittedSignal =
  defineSignal<[GApprovalPayload]>("approvalSubmitted");

// --- Interpreter ---

export async function genericWorkflow(
  input: GenericWorkflowInput
): Promise<GenericWorkflowResult> {
  console.log(
    `[GenericWorkflow] Starting for definition ${input.definitionId}, workflow ${input.workflowId}`
  );

  // Runtime variables keyed by "stepId.fieldName"
  const variables: Record<string, string> = {};

  // Signal state — reset before each wait step
  let taskCompleted = false;
  let taskCompletionData: GTaskCompletedPayload | undefined;
  let approvalReceived = false;
  let approvalData: GApprovalPayload | undefined;

  // Set up signal handlers
  setHandler(taskCompletedSignal, (data: GTaskCompletedPayload) => {
    console.log(
      `[GenericWorkflow] Received taskCompleted signal for task ${data.taskId}`
    );
    taskCompleted = true;
    taskCompletionData = data;
  });

  setHandler(approvalSubmittedSignal, (data: GApprovalPayload) => {
    console.log(
      `[GenericWorkflow] Received approvalSubmitted signal: ${data.outcome}`
    );
    approvalReceived = true;
    approvalData = data;
  });

  // Fetch definition steps
  const definition = await getWorkflowDefinition(input.definitionId);
  const steps = definition.steps;

  if (!steps || steps.length === 0) {
    console.log(`[GenericWorkflow] No steps found, completing immediately`);
    await setWorkflowStatus(input.workflowId, "completed");
    return {
      workflowId: input.workflowId,
      finalStatus: "completed",
      variables,
    };
  }

  // Build stepId → index map for condition jumps
  const stepIndexMap = new Map<string, number>();
  for (let i = 0; i < steps.length; i++) {
    stepIndexMap.set(steps[i].id, i);
  }

  // Helper to resolve {{stepId.fieldName}} references in a string
  function resolveVariable(template: string): string {
    return template.replace(
      /\{\{([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\}\}/g,
      (_match, stepId, field) => {
        return variables[`${stepId}.${field}`] ?? "";
      }
    );
  }

  // Execute steps sequentially
  let stepIndex = 0;
  while (stepIndex < steps.length) {
    const step = steps[stepIndex];
    console.log(
      `[GenericWorkflow] Executing step ${stepIndex}: ${step.type} (${step.label})`
    );

    await setWorkflowProgress(input.workflowId, step.id);

    switch (step.type) {
      case "trigger": {
        // No-op — already triggered
        break;
      }

      case "assign_task": {
        const config = (step as AssignTaskStep).config;
        const dueDate = config.dueDays
          ? new Date(Date.now() + config.dueDays * 86400000)
          : undefined;

        const taskId = await createTask(input.workflowId, {
          orgId: input.orgId,
          contactId: input.contactId,
          title: resolveVariable(config.title),
          description: config.description
            ? resolveVariable(config.description)
            : undefined,
          taskType: config.taskType,
          assignedRole:
            config.assignTo.type === "role" ? config.assignTo.role : undefined,
          assignedTo:
            config.assignTo.type === "user"
              ? config.assignTo.userId
              : undefined,
          priority: config.priority,
          dueDate,
          createdByStepId: step.id,
        });

        variables[`${step.id}.taskId`] = taskId;
        break;
      }

      case "wait_for_task": {
        const config = (step as WaitForTaskStep).config;
        // Reset flag before waiting
        taskCompleted = false;
        taskCompletionData = undefined;

        const completed = await condition(
          () => taskCompleted,
          `${config.timeoutDays} days`
        );

        if (!completed) {
          console.log(
            `[GenericWorkflow] wait_for_task timed out after ${config.timeoutDays} days`
          );
          await setWorkflowStatus(input.workflowId, "timeout");
          return {
            workflowId: input.workflowId,
            finalStatus: "timeout",
            variables,
          };
        }

        const completionData = taskCompletionData as GTaskCompletedPayload | undefined;
        variables[`${step.id}.completedBy`] = completionData?.completedBy ?? "";
        variables[`${step.id}.taskId`] = completionData?.taskId ?? "";
        break;
      }

      case "wait_for_approval": {
        const config = (step as WaitForApprovalStep).config;
        // Reset flag before waiting
        approvalReceived = false;
        approvalData = undefined;

        const received = await condition(
          () => approvalReceived,
          `${config.timeoutDays} days`
        );

        if (!received || !approvalData) {
          console.log(
            `[GenericWorkflow] wait_for_approval timed out after ${config.timeoutDays} days`
          );
          await setWorkflowStatus(input.workflowId, "timeout");
          return {
            workflowId: input.workflowId,
            finalStatus: "timeout",
            variables,
          };
        }

        const approval = approvalData as GApprovalPayload;
        variables[`${step.id}.outcome`] = approval.outcome;
        variables[`${step.id}.comment`] = approval.comment ?? "";
        variables[`${step.id}.approvedBy`] = approval.approvedBy;
        break;
      }

      case "update_status": {
        const config = (step as UpdateStatusStep).config;
        await setWorkflowStatus(input.workflowId, config.status);
        break;
      }

      case "condition": {
        const config = (step as ConditionStep).config;
        const fieldValue = resolveVariable(config.field);

        const matchedBranch = config.branches.find(
          (b) => b.value === fieldValue
        );
        const targetStepId = matchedBranch
          ? matchedBranch.gotoStepId
          : config.defaultGotoStepId;

        if (targetStepId) {
          const targetIndex = stepIndexMap.get(targetStepId);
          if (targetIndex !== undefined) {
            console.log(
              `[GenericWorkflow] Condition: jumping to step ${targetIndex} (${targetStepId})`
            );
            stepIndex = targetIndex;
            continue; // Skip the stepIndex++ at end of loop
          }
        }
        // No match and no default — just continue to next step
        break;
      }
    }

    stepIndex++;
  }

  // All steps completed
  await setWorkflowStatus(input.workflowId, "completed");
  console.log(`[GenericWorkflow] All steps completed for ${input.workflowId}`);

  return {
    workflowId: input.workflowId,
    finalStatus: "completed",
    variables,
  };
}
