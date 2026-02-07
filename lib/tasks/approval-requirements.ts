import { and, eq } from "drizzle-orm";
import type { WorkflowStep } from "@/types";
import { db } from "@/lib/db";
import { workflowDefinitions, workflows } from "@/lib/db/schema";

interface ApprovalCommentRequirementInput {
  orgId: string;
  workflowId?: string | null;
}

/**
 * Determines whether the workflow is currently waiting on an approval step
 * that requires a comment.
 */
export async function requiresApprovalComment({
  orgId,
  workflowId,
}: ApprovalCommentRequirementInput): Promise<boolean> {
  if (!workflowId) {
    return false;
  }

  const [workflowExecution] = await db
    .select({
      workflowDefinitionId: workflows.workflowDefinitionId,
      currentStepId: workflows.currentStepId,
    })
    .from(workflows)
    .where(and(eq(workflows.id, workflowId), eq(workflows.orgId, orgId)));

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

  const stepsData = definition?.steps as { steps: WorkflowStep[] } | null;
  const currentStep = stepsData?.steps?.find(
    (step) => step.id === workflowExecution.currentStepId
  );

  if (!currentStep || currentStep.type !== "wait_for_approval") {
    return false;
  }

  return Boolean(currentStep.config.requireComment);
}
