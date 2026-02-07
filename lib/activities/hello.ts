/**
 * Temporal Activities
 *
 * Activities are functions that interact with external systems (databases, APIs, etc.).
 * They can fail and be retried automatically by Temporal.
 *
 * Activities should be deterministic for a given input, but can have side effects.
 */

export async function greet(name: string): Promise<string> {
  console.log(`Activity: Greeting ${name}`);
  return `Hello, ${name}!`;
}

export async function sendHelloEmail(
  email: string,
  name: string
): Promise<void> {
  console.log(`Activity: Sending hello email to ${email}`);
  // Phase 1 hello-world stub - not used by workflows
  await new Promise((resolve) => setTimeout(resolve, 100));
  console.log(`Activity: Hello email sent to ${email}`);
}
