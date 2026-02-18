import type { WorkflowExecution } from "@/types"

export interface CreateWorkflowExecutionInput {
  contactId: string
  workflowDefinitionId?: string
  status?: string
}

export interface CreateWorkflowExecutionResult {
  startsImmediately: boolean
  workflow: WorkflowExecution
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  const payload = await response.json().catch(() => null)
  const message =
    (typeof payload?.error === "string" && payload.error) ||
    (typeof payload?.details === "string" && payload.details) ||
    fallback

  return message
}

export async function createWorkflowExecution(
  input: CreateWorkflowExecutionInput
): Promise<CreateWorkflowExecutionResult> {
  const startsImmediately = Boolean(input.workflowDefinitionId)
  const endpoint = startsImmediately ? "/api/workflows/trigger" : "/api/workflows"
  const payload = startsImmediately
    ? {
        contactId: input.contactId,
        workflowDefinitionId: input.workflowDefinitionId,
        initialStatus: input.status,
      }
    : input

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const fallback = startsImmediately ? "Failed to start workflow" : "Failed to create workflow"
    throw new Error(await parseErrorMessage(response, fallback))
  }

  const result = await response.json().catch(() => null)
  const workflow = result?.workflow as WorkflowExecution | undefined
  if (!workflow) {
    throw new Error("Workflow response was missing payload")
  }

  return {
    startsImmediately,
    workflow,
  }
}
