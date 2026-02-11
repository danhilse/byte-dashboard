/**
 * Generic Workflow Interpreter
 *
 * Reads a workflow definition's steps from the database and executes them
 * sequentially. Supports:
 * - trigger (no-op, already triggered)
 * - assign_task → creates a task via activity
 * - wait_for_task → waits for taskCompleted signal with timeout
 * - wait_for_approval → waits for approvalSubmitted signal with timeout
 * - notification → creates in-app user notifications
 * - update_status → updates workflow execution status
 * - condition → branches based on a variable value
 */

import {
  proxyActivities,
  defineSignal,
  setHandler,
  condition,
  sleep,
} from "@temporalio/workflow";
import type * as activities from "../activities";
import type {
  AssignTaskStep,
  WaitForTaskStep,
  WaitForApprovalStep,
  NotificationStep,
  UpdateStatusStep,
  SetVariableStep,
  ConditionStep,
  SendEmailStep,
  DelayStep,
  UpdateContactStep,
  UpdateTaskStep,
  WorkflowNotificationRecipients,
} from "@/types";
import {
  APPROVAL_SUBMITTED_SIGNAL_NAME,
  TASK_COMPLETED_SIGNAL_NAME,
  type ApprovalSignal,
  type TaskCompletedSignal,
} from "./signal-types";
import {
  buildCustomVariableTokenKeyMap,
  getCustomVariableRuntimeKeys,
} from "../workflow-builder-v2/template-variable-utils";
import type { WorkflowVariable } from "../workflow-builder-v2/types";

const {
  createTask,
  setWorkflowStatus,
  setWorkflowExecutionState,
  setWorkflowProgress,
  getWorkflowDefinition,
  sendEmail,
  notifyUsers,
  updateContact,
  updateTask,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "2 minutes",
  retry: {
    maximumAttempts: 3,
  },
});

// --- Input / Output ---

export interface GenericWorkflowInput {
  workflowExecutionId: string;
  orgId: string;
  contactId: string;
  contactEmail: string;
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
  definitionId: string;
  initialStatus?: string;
}

export interface GenericWorkflowResult {
  workflowExecutionId: string;
  finalStatus: string;
  variables: Record<string, string>;
}

// --- Signals ---

const taskCompletedSignal = defineSignal<[TaskCompletedSignal]>(
  TASK_COMPLETED_SIGNAL_NAME
);
const approvalSubmittedSignal = defineSignal<[ApprovalSignal]>(
  APPROVAL_SUBMITTED_SIGNAL_NAME
);

const ALLOWED_UPDATE_TASK_FIELDS = new Set([
  "status",
  "priority",
  "description",
  "assignedRole",
  "assignedTo",
]);

const AUTHORING_STORAGE_KEY = "__builderV2Authoring";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeWorkflowVariables(variables: unknown): WorkflowVariable[] {
  if (!Array.isArray(variables)) {
    return [];
  }

  return variables.filter((variable): variable is WorkflowVariable => {
    if (!isRecord(variable)) {
      return false;
    }

    return (
      typeof variable.id === "string" &&
      typeof variable.name === "string" &&
      typeof variable.type === "string" &&
      isRecord(variable.source)
    );
  });
}

function extractAuthoringVariablesFromDefinition(
  definitionVariables: unknown
): WorkflowVariable[] {
  const inlineVariables = normalizeWorkflowVariables(definitionVariables);
  if (inlineVariables.length > 0) {
    return inlineVariables;
  }

  if (!isRecord(definitionVariables)) {
    return [];
  }

  const payload = definitionVariables[AUTHORING_STORAGE_KEY];
  if (!isRecord(payload)) {
    return [];
  }

  const workflowPayload = payload.workflow;
  if (!isRecord(workflowPayload)) {
    return [];
  }

  return normalizeWorkflowVariables(workflowPayload.variables);
}

// --- Interpreter ---

export async function genericWorkflow(
  input: GenericWorkflowInput
): Promise<GenericWorkflowResult> {
  console.log(
    `[GenericWorkflow] Starting for definition ${input.definitionId}, execution ${input.workflowExecutionId}`
  );

  // Runtime variables keyed by "stepId.fieldName"
  const variables: Record<string, string> = {};

  // Signal state — reset before each wait step
  let taskCompleted = false;
  let taskCompletionData: TaskCompletedSignal | undefined;
  let approvalReceived = false;
  let approvalData: ApprovalSignal | undefined;

  // Set up signal handlers
  setHandler(taskCompletedSignal, (data: TaskCompletedSignal) => {
    console.log(
      `[GenericWorkflow] Received taskCompleted signal for task ${data.taskId}`
    );
    taskCompleted = true;
    taskCompletionData = data;
  });

  setHandler(approvalSubmittedSignal, (data: ApprovalSignal) => {
    console.log(
      `[GenericWorkflow] Received approvalSubmitted signal: ${data.outcome}`
    );
    approvalReceived = true;
    approvalData = data;
  });

  // Inject built-in contact variables
  variables["contact.email"] = input.contactEmail;
  variables["contact.firstName"] = input.contactFirstName;
  variables["contact.lastName"] = input.contactLastName;
  variables["contact.phone"] = input.contactPhone;
  variables["contact.id"] = input.contactId;
  variables["workflow.status"] = input.initialStatus ?? "";

  const toVariableString = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return "";
  };

  // Fetch definition steps
  const definition = await getWorkflowDefinition(input.definitionId);
  variables["workflow.name"] = definition.name ?? "";
  variables["workflow.id"] = definition.id ?? input.definitionId;
  variables["workflow.definitionId"] = input.definitionId;
  const authoringVariables =
    definition.authoringVariables?.length > 0
      ? definition.authoringVariables
      : extractAuthoringVariablesFromDefinition(definition.variables);
  const customVariableKeyMap = buildCustomVariableTokenKeyMap(
    authoringVariables
  );
  const customTokenKeyToVariableId = new Map<string, string>();
  for (const [variableId, tokenKey] of customVariableKeyMap.entries()) {
    customTokenKeyToVariableId.set(tokenKey, variableId);
  }

  for (const variable of authoringVariables) {
    if (variable.source.type !== "custom") continue;
    const value = toVariableString(variable.source.value);
    for (const runtimeKey of getCustomVariableRuntimeKeys(
      variable.id,
      customVariableKeyMap
    )) {
      variables[runtimeKey] = value;
    }
  }

  const steps = definition.steps;
  const definitionStatuses = definition.statuses;
  const hasDefinitionStatuses = definitionStatuses.length > 0;
  const allowedDefinitionStatuses = new Set(
    definitionStatuses.map((status) => status.id)
  );
  const orderedDefinitionStatuses = [...definitionStatuses].sort(
    (a, b) => a.order - b.order
  );
  let lastStatusSet: string | null = null;

  const resolveSystemStatus = (status: string): string | null => {
    if (!hasDefinitionStatuses) return status;
    return allowedDefinitionStatuses.has(status) ? status : null;
  };

  if (!steps || steps.length === 0) {
    console.log(`[GenericWorkflow] No steps found, completing immediately`);
    await setWorkflowExecutionState(input.workflowExecutionId, "completed");
    return {
      workflowExecutionId: input.workflowExecutionId,
      finalStatus: lastStatusSet ?? "completed",
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
        const key = `${stepId}.${field}`;
        const direct = variables[key];
        if (direct !== undefined) {
          return direct;
        }

        if (stepId === "custom") {
          const mappedVariableId = customTokenKeyToVariableId.get(field);
          if (mappedVariableId) {
            const fallback = variables[`custom.${mappedVariableId}`];
            if (fallback !== undefined) {
              return fallback;
            }
          }
        }

        return "";
      }
    );
  }

  function resolveNotificationRecipients(
    recipients: WorkflowNotificationRecipients
  ): WorkflowNotificationRecipients {
    if (recipients.type === "organization") {
      return recipients;
    }

    if (recipients.type === "user") {
      return {
        type: "user",
        userId: resolveVariable(recipients.userId),
      };
    }

    if (recipients.type === "role") {
      return {
        type: "role",
        role: resolveVariable(recipients.role),
      };
    }

    return {
      type: "group",
      groupIds: recipients.groupIds.map((groupId) => resolveVariable(groupId)),
    };
  }

  try {
    // Execute steps sequentially
    let stepIndex = 0;
    while (stepIndex < steps.length) {
      const step = steps[stepIndex];
      console.log(
        `[GenericWorkflow] Executing step ${stepIndex}: ${step.type} (${step.label})`
      );

      await setWorkflowProgress(input.workflowExecutionId, step.id, step.phaseId);

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
          const links = (config.links ?? [])
            .map((link) => resolveVariable(link).trim())
            .filter((link) => link.length > 0);

          const taskId = await createTask(input.workflowExecutionId, {
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
            metadata: links.length > 0 ? { links } : undefined,
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
            const timeoutStatus = resolveSystemStatus("timeout");
            if (timeoutStatus) {
              await setWorkflowStatus(input.workflowExecutionId, timeoutStatus, {
                markCompletedAt: true,
                workflowExecutionState: "timeout",
              });
              lastStatusSet = timeoutStatus;
              variables["workflow.status"] = timeoutStatus;
            } else {
              await setWorkflowExecutionState(
                input.workflowExecutionId,
                "timeout"
              );
            }
            return {
              workflowExecutionId: input.workflowExecutionId,
              finalStatus: timeoutStatus ?? "timeout",
              variables,
            };
          }

          const completionData = taskCompletionData as
            | TaskCompletedSignal
            | undefined;
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
            const timeoutStatus = resolveSystemStatus("timeout");
            if (timeoutStatus) {
              await setWorkflowStatus(input.workflowExecutionId, timeoutStatus, {
                markCompletedAt: true,
                workflowExecutionState: "timeout",
              });
              lastStatusSet = timeoutStatus;
              variables["workflow.status"] = timeoutStatus;
            } else {
              await setWorkflowExecutionState(
                input.workflowExecutionId,
                "timeout"
              );
            }
            return {
              workflowExecutionId: input.workflowExecutionId,
              finalStatus: timeoutStatus ?? "timeout",
              variables,
            };
          }

          const approval = approvalData as ApprovalSignal;
          variables[`${step.id}.outcome`] = approval.outcome;
          variables[`${step.id}.comment`] = approval.comment ?? "";
          variables[`${step.id}.approvedBy`] = approval.approvedBy;
          break;
        }

        case "update_status": {
          const config = (step as UpdateStatusStep).config;
          if (
            hasDefinitionStatuses &&
            !allowedDefinitionStatuses.has(config.status)
          ) {
            throw new Error(
              `[GenericWorkflow] update_status misconfigured at step "${step.label}": status "${config.status}" is not defined on workflow definition`
            );
          }
          await setWorkflowStatus(input.workflowExecutionId, config.status);
          lastStatusSet = config.status;
          variables["workflow.status"] = config.status;
          break;
        }

        case "set_variable": {
          const config = (step as SetVariableStep).config;
          const variableId = config.variableId?.trim();
          if (!variableId) {
            throw new Error(
              `[GenericWorkflow] set_variable misconfigured at step "${step.label}": variableId is required`
            );
          }
          const resolvedValue = resolveVariable(config.value);
          for (const runtimeKey of getCustomVariableRuntimeKeys(
            variableId,
            customVariableKeyMap
          )) {
            variables[runtimeKey] = resolvedValue;
          }
          console.log(
            `[GenericWorkflow] set_variable "${variableId}" assigned "${resolvedValue}" across ${getCustomVariableRuntimeKeys(
              variableId,
              customVariableKeyMap
            ).join(", ")}`
          );
          break;
        }

        case "notification": {
          const config = (step as NotificationStep).config;

          await notifyUsers(input.workflowExecutionId, {
            orgId: input.orgId,
            recipients: resolveNotificationRecipients(config.recipients),
            title: resolveVariable(config.title),
            message: resolveVariable(config.message),
          });
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

        case "send_email": {
          const config = (step as SendEmailStep).config;
          const to = resolveVariable(config.to);
          const subject = resolveVariable(config.subject);
          const body = resolveVariable(config.body);
          await sendEmail(to, subject, body);
          break;
        }

        case "delay": {
          const config = (step as DelayStep).config;
          const durationStr = `${config.duration} ${config.unit}`;
          console.log(`[GenericWorkflow] Sleeping for ${durationStr}`);
          await sleep(durationStr);
          break;
        }

        case "update_contact": {
          const config = (step as UpdateContactStep).config;
          const fields: Record<string, string> = {};
          for (const { field, value } of config.fields) {
            fields[field] = resolveVariable(value);
          }
          await updateContact(input.contactId, fields);
          break;
        }

        case "update_task": {
          const config = (step as UpdateTaskStep).config;
          const referencedStepIndex = stepIndexMap.get(config.taskStepId);
          if (!config.taskStepId || referencedStepIndex === undefined) {
            throw new Error(
              `[GenericWorkflow] update_task misconfigured at step "${step.label}": referenced Assign Task step "${config.taskStepId}" does not exist`
            );
          }

          if (referencedStepIndex >= stepIndex) {
            throw new Error(
              `[GenericWorkflow] update_task misconfigured at step "${step.label}": referenced step must be earlier in the workflow`
            );
          }

          const referencedStep = steps[referencedStepIndex];
          if (referencedStep.type !== "assign_task") {
            throw new Error(
              `[GenericWorkflow] update_task misconfigured at step "${step.label}": referenced step "${referencedStep.id}" is not an Assign Task step`
            );
          }

          const taskId = variables[`${config.taskStepId}.taskId`];
          if (!taskId) {
            throw new Error(
              `[GenericWorkflow] update_task misconfigured at step "${step.label}": no taskId available for referenced step "${config.taskStepId}"`
            );
          }

          if (!config.fields.length) {
            throw new Error(
              `[GenericWorkflow] update_task misconfigured at step "${step.label}": at least one field update is required`
            );
          }

          const fields: Record<string, string> = {};
          for (const { field, value } of config.fields) {
            if (!field || !ALLOWED_UPDATE_TASK_FIELDS.has(field)) {
              throw new Error(
                `[GenericWorkflow] update_task misconfigured at step "${step.label}": invalid field "${field}"`
              );
            }

            const resolvedValue = resolveVariable(value);
            if (field === "status") {
              if (
                !["backlog", "todo", "in_progress", "done"].includes(
                  resolvedValue
                )
              ) {
                throw new Error(
                  `[GenericWorkflow] update_task misconfigured at step "${step.label}": invalid status "${resolvedValue}"`
                );
              }

              if (resolvedValue === "done") {
                throw new Error(
                  `[GenericWorkflow] update_task at step "${step.label}" cannot set status to "done"; use task completion APIs/signals`
                );
              }
            }

            if (
              field === "priority" &&
              !["low", "medium", "high", "urgent"].includes(resolvedValue)
            ) {
              throw new Error(
                `[GenericWorkflow] update_task misconfigured at step "${step.label}": invalid priority "${resolvedValue}"`
              );
            }

            fields[field] = resolvedValue;
          }

          await updateTask(taskId, fields);
          break;
        }
      }

      stepIndex++;
    }

    // All steps completed. If no explicit update_status step ran, default to
    // All steps completed successfully. Business status is only changed by
    // explicit update_status actions; runtime completion is tracked separately.
    const finalStatus = lastStatusSet ?? orderedDefinitionStatuses[0]?.id ?? "completed";
    variables["workflow.status"] = finalStatus;
    await setWorkflowExecutionState(input.workflowExecutionId, "completed");
    console.log(`[GenericWorkflow] All steps completed for ${input.workflowExecutionId}`);

    return {
      workflowExecutionId: input.workflowExecutionId,
      finalStatus,
      variables,
    };
  } catch (error) {
    try {
      const failedStatus = resolveSystemStatus("failed");
      if (failedStatus) {
        await setWorkflowStatus(input.workflowExecutionId, failedStatus, {
          markCompletedAt: true,
          workflowExecutionState: "error",
          errorDefinition: error instanceof Error ? error.message : String(error),
        });
        lastStatusSet = failedStatus;
        variables["workflow.status"] = failedStatus;
      } else {
        await setWorkflowExecutionState(input.workflowExecutionId, "error", {
          errorDefinition: error instanceof Error ? error.message : String(error),
        });
        console.log(
          `[GenericWorkflow] Definition has no "failed" status. Preserving business status for ${input.workflowExecutionId}.`
        );
      }
    } catch (statusError) {
      console.log(
        `[GenericWorkflow] Failed to mark workflow as failed: ${String(
          statusError
        )}`
      );
    }

    throw error;
  }
}
