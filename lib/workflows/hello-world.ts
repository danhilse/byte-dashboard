/**
 * Temporal Workflows
 *
 * Workflows orchestrate activities and define the business logic.
 * They must be deterministic - no direct I/O, no random numbers, no Date.now().
 * All side effects must go through activities.
 *
 * Workflows can:
 * - Run for hours, days, or weeks
 * - Wait for external signals
 * - Set timers and schedules
 * - Handle retries and timeouts automatically
 */

import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "../activities/hello";

// Create activity proxies with default timeout
const { greet, sendHelloEmail } = proxyActivities<typeof activities>({
  startToCloseTimeout: "1 minute",
});

export interface HelloWorkflowInput {
  name: string;
  email?: string;
}

export interface HelloWorkflowResult {
  greeting: string;
  emailSent: boolean;
}

/**
 * Hello World Workflow
 *
 * A simple workflow that demonstrates:
 * 1. Executing activities
 * 2. Passing data between activities
 * 3. Returning results
 */
export async function helloWorldWorkflow(
  input: HelloWorkflowInput
): Promise<HelloWorkflowResult> {
  console.log(`Workflow: Starting hello world for ${input.name}`);

  // Execute greeting activity
  const greeting = await greet(input.name);

  // Send welcome email if email provided
  let emailSent = false;
  if (input.email) {
    await sendHelloEmail(input.email, input.name);
    emailSent = true;
  }

  console.log(`Workflow: Completed hello world for ${input.name}`);

  return {
    greeting,
    emailSent,
  };
}
