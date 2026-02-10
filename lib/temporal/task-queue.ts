export const DEFAULT_TEMPORAL_TASK_QUEUE = "byte-dashboard";

export function getTemporalTaskQueue(): string {
  const configuredTaskQueue = process.env.TEMPORAL_TASK_QUEUE?.trim();
  if (configuredTaskQueue) {
    return configuredTaskQueue;
  }

  return DEFAULT_TEMPORAL_TASK_QUEUE;
}
