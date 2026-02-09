function createUuid(): string {
  if (
    typeof globalThis !== "undefined" &&
    typeof globalThis.crypto?.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID()
  }

  return `${Math.random().toString(36).slice(2, 10)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`
}

export function createEntityId(prefix: string): string {
  return `${prefix}-${createUuid()}`
}

export function createStepId(): string {
  return createEntityId("step")
}

export function createBranchId(): string {
  return createEntityId("branch")
}

export function createTrackId(trackLabel?: string): string {
  return trackLabel ? createEntityId(`track-${trackLabel}`) : createEntityId("track")
}

export function createActionId(): string {
  return createEntityId("action")
}

export function createPhaseId(): string {
  return createEntityId("phase")
}

export function createCustomVariableId(): string {
  return createEntityId("var-custom")
}
