import { and, eq } from "drizzle-orm";
import type { WorkflowStep } from "@/types";
import { db } from "@/lib/db";
import { workflowDefinitions, workflowExecutions } from "@/lib/db/schema";

interface ApprovalCommentRequirementInput {
  orgId: string;
  workflowExecutionId?: string | null;
}

/**
 * Determines whether the workflow is currently waiting on an approval step
 * that requires a comment.
 */
export async function requiresApprovalComment({
  orgId,
  workflowExecutionId,
}: ApprovalCommentRequirementInput): Promise<boolean> {
  if (!workflowExecutionId) {
    return false;
  }

  const [workflowExecution] = await db
    .select({
      workflowDefinitionId: workflowExecutions.workflowDefinitionId,
      currentStepId: workflowExecutions.currentStepId,
    })
    .from(workflowExecutions)
    .where(and(eq(workflowExecutions.id, workflowExecutionId), eq(workflowExecutions.orgId, orgId)));

  if (!workflowExecution?.workflowDefinitionId || !workflowExecution.currentStepId) {
    return false;
  }

  const [definition] = await db
    .select({ steps: workflowDefinitions.steps })
    .from(workflowDefinitions)
    .where(
      and(
        eq(workflowDefinitions.id, workflowExecution.workflowDefinitionId),
        eq(workflowDefinitions.orgId, orgId)
      )
    );

  const steps = (definition?.steps as WorkflowStep[] | null) ?? [];
  const currentStep = steps.find(
    (step) => step.id === workflowExecution.currentStepId
  );

  if (!currentStep || currentStep.type !== "wait_for_approval") {
    return false;
  }

  return Boolean(currentStep.config.requireComment);
}
