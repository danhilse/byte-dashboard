import type {
  ConditionStep,
  DefinitionStatus,
  TriggerStep,
  WorkflowPhase,
  WorkflowStep,
} from "@/types"
import {
  isBranchStep,
  type AdvancementCondition,
  type BranchStepV2,
  type StandardStepV2,
  type WorkflowDefinitionV2,
  type WorkflowPhase as WorkflowPhaseV2,
  type WorkflowStepV2,
  type WorkflowTrigger,
  type WorkflowVariable,
} from "@/lib/workflow-builder-v2/types"

export const AUTHORING_STORAGE_KEY = "__builderV2Authoring"
const DEFAULT_WAIT_TIMEOUT_DAYS = 7

type SupportedActionType =
  | "send_email"
  | "notification"
  | "create_task"
  | "update_contact"
  | "update_status"

const SUPPORTED_ACTION_TYPES = new Set<SupportedActionType>([
  "send_email",
  "notification",
  "create_task",
  "update_contact",
  "update_status",
])

const SUPPORTED_ADVANCEMENT_TYPES = new Set([
  "automatic",
  "when_task_completed",
  "when_duration_passes",
])

export interface PersistedAuthoringPayload {
  schemaVersion: number
  workflow: {
    trigger?: WorkflowTrigger
    contactRequired?: boolean
    steps?: unknown
    phases?: unknown
    variables?: unknown
  }
}

export interface AuthoringValidationIssue {
  code:
    | "invalid_shape"
    | "duplicate_step_id"
    | "duplicate_action_id"
    | "unsupported_action"
    | "unsupported_advancement"
    | "invalid_advancement"
    | "invalid_branch"
    | "invalid_status"
    | "unsupported_variable_reference"
  path: string
  message: string
}

export class AuthoringCompileError extends Error {
  issues: AuthoringValidationIssue[]

  constructor(issues: AuthoringValidationIssue[]) {
    super("Authoring validation failed")
    this.name = "AuthoringCompileError"
    this.issues = issues
  }
}

export interface DefinitionRecordLike {
  id: string
  name: string
  description?: string | null
  statuses?: unknown
  phases?: unknown
  variables?: unknown
  steps?: unknown
  createdAt: string
  updatedAt: string
}

interface CompileChunk {
  sourceTopLevelId: string
  startRuntimeStepId: string
  runtimeSteps: WorkflowStep[]
  pendingNextTopLevelTargets: {
    step: ConditionStep
    nextTopLevelId?: string
  }[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function readPersistedAuthoringPayload(
  variables: unknown
): PersistedAuthoringPayload | null {
  if (!isRecord(variables)) {
    return null
  }

  const payload = variables[AUTHORING_STORAGE_KEY]
  if (!isRecord(payload) || !isRecord(payload.workflow)) {
    return null
  }

  return payload as unknown as PersistedAuthoringPayload
}

export function hasPersistedAuthoringPayload(variables: unknown): boolean {
  return readPersistedAuthoringPayload(variables) !== null
}

function normalizeStatuses(statuses: unknown): DefinitionStatus[] {
  if (!Array.isArray(statuses)) {
    return []
  }

  return statuses
    .filter((status): status is DefinitionStatus => {
      if (!isRecord(status)) return false
      return (
        typeof status.id === "string" &&
        typeof status.label === "string" &&
        typeof status.order === "number"
      )
    })
    .map((status) => ({
      id: status.id.trim(),
      label: status.label.trim(),
      order: status.order,
      color:
        typeof status.color === "string" && status.color.trim().length > 0
          ? status.color.trim()
          : undefined,
    }))
    .sort((a, b) => a.order - b.order)
}

function normalizePhases(phases: unknown): WorkflowPhaseV2[] {
  if (!Array.isArray(phases)) {
    return []
  }

  return phases
    .filter(isRecord)
    .map((phase, index) => {
      const id =
        typeof phase.id === "string" && phase.id.length > 0
          ? phase.id
          : `phase_${index + 1}`

      const name =
        typeof phase.name === "string" && phase.name.length > 0
          ? phase.name
          : typeof phase.label === "string" && phase.label.length > 0
            ? phase.label
            : `Phase ${index + 1}`

      const color = typeof phase.color === "string" ? phase.color : undefined
      const order =
        typeof phase.order === "number" && Number.isFinite(phase.order)
          ? phase.order
          : index

      return { id, name, color, order }
    })
    .sort((a, b) => a.order - b.order)
}

function normalizeVariables(variables: unknown): WorkflowVariable[] {
  if (!Array.isArray(variables)) {
    return []
  }

  return variables.filter((variable): variable is WorkflowVariable => {
    if (!isRecord(variable)) {
      return false
    }
    return (
      typeof variable.id === "string" &&
      typeof variable.name === "string" &&
      typeof variable.type === "string" &&
      isRecord(variable.source)
    )
  })
}

function isLikelyWorkflowStepV2Array(value: unknown): value is WorkflowStepV2[] {
  if (!Array.isArray(value)) return false

  return value.every((step) => {
    if (!isRecord(step)) return false
    return (
      typeof step.id === "string" &&
      typeof step.name === "string" &&
      Array.isArray(step.actions) &&
      isRecord(step.advancementCondition)
    )
  })
}

function normalizeTrigger(trigger: unknown): WorkflowTrigger {
  if (!isRecord(trigger) || typeof trigger.type !== "string") {
    return { type: "manual" }
  }

  const initialStatus =
    typeof trigger.initialStatus === "string" &&
    trigger.initialStatus.trim().length > 0
      ? trigger.initialStatus.trim()
      : undefined

  switch (trigger.type) {
    case "manual":
      return initialStatus
        ? { type: "manual", initialStatus }
        : { type: "manual" }
    case "contact_created":
      return initialStatus
        ? { type: "contact_created", initialStatus }
        : { type: "contact_created" }
    case "contact_field_changed": {
      const watchedFields = Array.isArray(trigger.watchedFields)
        ? [...new Set(
            trigger.watchedFields.filter(
              (field): field is string =>
                typeof field === "string" && field.trim().length > 0
            )
          )]
        : []

      return initialStatus
        ? {
            type: "contact_field_changed",
            watchedFields,
            initialStatus,
          }
        : {
            type: "contact_field_changed",
            watchedFields,
          }
    }
    case "contact_status":
      // Backward compatibility for older persisted authoring payloads.
      return initialStatus
        ? {
            type: "contact_field_changed",
            watchedFields: ["status"],
            initialStatus,
          }
        : {
            type: "contact_field_changed",
            watchedFields: ["status"],
          }
    case "form_submission":
      return initialStatus
        ? {
            type: "form_submission",
            formId: typeof trigger.formId === "string" ? trigger.formId : "",
            initialStatus,
          }
        : {
            type: "form_submission",
            formId: typeof trigger.formId === "string" ? trigger.formId : "",
          }
    case "api":
      return initialStatus
        ? { type: "api", initialStatus }
        : { type: "api" }
    default:
      return { type: "manual" }
  }
}

export function fromDefinitionToAuthoring(
  definition: DefinitionRecordLike
): WorkflowDefinitionV2 {
  const persisted = readPersistedAuthoringPayload(definition.variables)
  const statuses = normalizeStatuses(definition.statuses)
  const now = new Date().toISOString()

  const fallback: WorkflowDefinitionV2 = {
    id: definition.id,
    name: definition.name,
    description: definition.description ?? undefined,
    trigger: { type: "manual" },
    contactRequired: true,
    steps: isLikelyWorkflowStepV2Array(definition.steps) ? definition.steps : [],
    phases: normalizePhases(definition.phases),
    statuses,
    variables: normalizeVariables(definition.variables),
    createdAt: definition.createdAt || now,
    updatedAt: definition.updatedAt || now,
  }

  if (!persisted) {
    return fallback
  }

  return {
    ...fallback,
    trigger: normalizeTrigger(persisted.workflow.trigger),
    contactRequired:
      typeof persisted.workflow.contactRequired === "boolean"
        ? persisted.workflow.contactRequired
        : true,
    steps: isLikelyWorkflowStepV2Array(persisted.workflow.steps)
      ? persisted.workflow.steps
      : fallback.steps,
    phases: normalizePhases(persisted.workflow.phases),
    variables: normalizeVariables(persisted.workflow.variables),
  }
}

function toDefinitionPhases(phases: WorkflowPhaseV2[]): WorkflowPhase[] {
  return phases.map((phase, index) => ({
    id: phase.id,
    label: phase.name,
    order:
      typeof phase.order === "number" && Number.isFinite(phase.order)
        ? phase.order
        : index,
  }))
}

function findUnsupportedVariableRefs(value: string): string[] {
  const matches = value.match(/\bvar-[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?\b/g) ?? []
  return matches.filter((ref) => !ref.startsWith("var-contact."))
}

function convertValueTemplate(value: string): string {
  return value.replace(
    /\bvar-contact\.([A-Za-z0-9_-]+)\b/g,
    (_match, field: string) => `{{contact.${field}}}`
  )
}

function normalizeBranchFieldRef(ref: string): string | null {
  if (!ref) return null
  if (ref.startsWith("{{") && ref.endsWith("}}")) {
    return ref
  }
  const contactMatch = ref.match(/^var-contact\.([A-Za-z0-9_-]+)$/)
  if (contactMatch) {
    return `{{contact.${contactMatch[1]}}}`
  }
  return null
}

export function validateAuthoring(
  authoring: WorkflowDefinitionV2,
  options: { definitionStatuses?: DefinitionStatus[] } = {}
): AuthoringValidationIssue[] {
  const issues: AuthoringValidationIssue[] = []
  const statuses = options.definitionStatuses?.length
    ? options.definitionStatuses
    : authoring.statuses ?? []

  if (statuses.length === 0) {
    issues.push({
      code: "invalid_status",
      path: "statuses",
      message: "Workflow definition must include at least one status.",
    })
  }

  const seenStatusIds = new Set<string>()
  const seenStatusOrders = new Set<number>()
  for (let statusIndex = 0; statusIndex < statuses.length; statusIndex++) {
    const status = statuses[statusIndex]
    if (seenStatusIds.has(status.id)) {
      issues.push({
        code: "invalid_status",
        path: `statuses[${statusIndex}].id`,
        message: `Duplicate status id "${status.id}".`,
      })
    } else {
      seenStatusIds.add(status.id)
    }

    if (seenStatusOrders.has(status.order)) {
      issues.push({
        code: "invalid_status",
        path: `statuses[${statusIndex}].order`,
        message: `Duplicate status order "${status.order}".`,
      })
    } else {
      seenStatusOrders.add(status.order)
    }
  }

  const seenTopLevelStepIds = new Set<string>()
  const seenActionIds = new Set<string>()
  const allowedStatuses = new Set(
    statuses.map((status) => status.id)
  )
  const triggerInitialStatus = authoring.trigger.initialStatus?.trim()
  if (triggerInitialStatus && !allowedStatuses.has(triggerInitialStatus)) {
    issues.push({
      code: "invalid_status",
      path: "trigger.initialStatus",
      message: `Status "${triggerInitialStatus}" is not defined on this workflow.`,
    })
  }

  const validateStandardStep = (
    step: StandardStepV2,
    path: string
  ) => {
    const localCreateTaskActions = new Set<string>()

    for (let actionIndex = 0; actionIndex < step.actions.length; actionIndex++) {
      const action = step.actions[actionIndex]
      const actionPath = `${path}.actions[${actionIndex}]`

      if (!action.id || !action.id.trim()) {
        issues.push({
          code: "invalid_shape",
          path: `${actionPath}.id`,
          message: "Action id is required.",
        })
      } else if (seenActionIds.has(action.id)) {
        issues.push({
          code: "duplicate_action_id",
          path: `${actionPath}.id`,
          message: `Duplicate action id "${action.id}".`,
        })
      } else {
        seenActionIds.add(action.id)
      }

      if (!SUPPORTED_ACTION_TYPES.has(action.type as SupportedActionType)) {
        issues.push({
          code: "unsupported_action",
          path: `${actionPath}.type`,
          message: `Action type "${action.type}" is not supported by runtime compiler.`,
        })
        continue
      }

      if (action.type === "create_task") {
        localCreateTaskActions.add(action.id)
      }

      if (action.type === "update_status") {
        const statusId = action.config.status
        if (
          allowedStatuses.size > 0 &&
          (!statusId || !allowedStatuses.has(statusId))
        ) {
          issues.push({
            code: "invalid_status",
            path: `${actionPath}.config.status`,
            message: `Status "${statusId}" is not defined on this workflow.`,
          })
        }
      }

      const variableSensitiveValues: string[] = []
      switch (action.type) {
        case "send_email":
          variableSensitiveValues.push(
            action.config.to,
            action.config.subject,
            action.config.body,
            action.config.from ?? ""
          )
          break
        case "notification":
          variableSensitiveValues.push(action.config.title, action.config.message)
          if (action.config.recipients.type === "user") {
            variableSensitiveValues.push(action.config.recipients.userId)
          } else if (action.config.recipients.type === "role") {
            variableSensitiveValues.push(action.config.recipients.role)
          } else if (action.config.recipients.type === "group") {
            variableSensitiveValues.push(...action.config.recipients.groupIds)
          }
          break
        case "create_task":
          variableSensitiveValues.push(
            action.config.title,
            action.config.description ?? "",
            ...(action.config.links ?? [])
          )
          break
        case "update_contact":
          for (const field of action.config.fields) {
            variableSensitiveValues.push(field.value)
          }
          break
        case "update_status":
          break
      }

      for (let valueIndex = 0; valueIndex < variableSensitiveValues.length; valueIndex++) {
        const value = variableSensitiveValues[valueIndex]
        const unsupportedRefs = findUnsupportedVariableRefs(value)
        if (unsupportedRefs.length > 0) {
          issues.push({
            code: "unsupported_variable_reference",
            path: `${actionPath}.config`,
            message: `Unsupported variable reference(s): ${unsupportedRefs.join(", ")}.`,
          })
        }
      }
    }

    const condition: AdvancementCondition = step.advancementCondition
    const conditionPath = `${path}.advancementCondition`

    if (condition.type === "compound") {
      issues.push({
        code: "unsupported_advancement",
        path: conditionPath,
        message: "Compound advancement conditions are not supported by runtime compiler.",
      })
      return
    }

    if (!SUPPORTED_ADVANCEMENT_TYPES.has(condition.type)) {
      issues.push({
        code: "unsupported_advancement",
        path: `${conditionPath}.type`,
        message: `Advancement condition "${condition.type}" is not supported by runtime compiler.`,
      })
      return
    }

    if (condition.type === "when_task_completed") {
      if (!localCreateTaskActions.has(condition.config.taskActionId)) {
        issues.push({
          code: "invalid_advancement",
          path: `${conditionPath}.config.taskActionId`,
          message:
            "Task advancement must reference a Create Task action in the same step.",
        })
      }
    }

    if (condition.type === "when_duration_passes") {
      if (
        typeof condition.config.duration !== "number" ||
        !Number.isFinite(condition.config.duration) ||
        condition.config.duration <= 0
      ) {
        issues.push({
          code: "invalid_advancement",
          path: `${conditionPath}.config.duration`,
          message: "Duration must be a positive number.",
        })
      }
    }
  }

  for (let stepIndex = 0; stepIndex < authoring.steps.length; stepIndex++) {
    const step = authoring.steps[stepIndex]
    const stepPath = `steps[${stepIndex}]`

    if (!step.id || !step.id.trim()) {
      issues.push({
        code: "invalid_shape",
        path: `${stepPath}.id`,
        message: "Step id is required.",
      })
    } else if (seenTopLevelStepIds.has(step.id)) {
      issues.push({
        code: "duplicate_step_id",
        path: `${stepPath}.id`,
        message: `Duplicate step id "${step.id}".`,
      })
    } else {
      seenTopLevelStepIds.add(step.id)
    }

    if (!isBranchStep(step)) {
      validateStandardStep(step, stepPath)
      continue
    }

    if (step.tracks.length !== 2) {
      issues.push({
        code: "invalid_branch",
        path: `${stepPath}.tracks`,
        message: "Branch steps must contain exactly two tracks.",
      })
      continue
    }

    if (!["equals", "not_equals"].includes(step.condition.operator)) {
      issues.push({
        code: "unsupported_advancement",
        path: `${stepPath}.condition.operator`,
        message: `Branch operator "${step.condition.operator}" is not supported by runtime compiler.`,
      })
    }

    if (typeof step.condition.compareValue !== "string") {
      issues.push({
        code: "invalid_branch",
        path: `${stepPath}.condition.compareValue`,
        message: "Branch compare value must be a string.",
      })
    }

    if (!normalizeBranchFieldRef(step.condition.variableRef)) {
      issues.push({
        code: "unsupported_variable_reference",
        path: `${stepPath}.condition.variableRef`,
        message:
          "Branch condition variable must be a contact variable reference (for example: var-contact.email).",
      })
    }

    for (let trackIndex = 0; trackIndex < step.tracks.length; trackIndex++) {
      const track = step.tracks[trackIndex]
      const trackPath = `${stepPath}.tracks[${trackIndex}]`
      if (track.steps.length === 0) {
        issues.push({
          code: "invalid_branch",
          path: `${trackPath}.steps`,
          message: "Each branch track must contain at least one step.",
        })
      }
      for (
        let nestedStepIndex = 0;
        nestedStepIndex < track.steps.length;
        nestedStepIndex++
      ) {
        const nestedStep = track.steps[nestedStepIndex]
        validateStandardStep(
          nestedStep,
          `${trackPath}.steps[${nestedStepIndex}]`
        )
      }
    }
  }

  return issues
}

function createRuntimeStepId(
  base: string,
  usedIds: Set<string>
): string {
  const safeBase =
    base
      .trim()
      .replace(/[^A-Za-z0-9_-]/g, "_")
      .replace(/_+/g, "_") || "step"
  let candidate = safeBase
  let index = 1
  while (usedIds.has(candidate)) {
    candidate = `${safeBase}__${index}`
    index += 1
  }
  usedIds.add(candidate)
  return candidate
}

function createTriggerStep(trigger: WorkflowTrigger, usedIds: Set<string>): WorkflowStep {
  const triggerType: TriggerStep["config"]["triggerType"] =
    trigger.type === "form_submission"
      ? "form_submission"
      : trigger.type === "contact_created"
        ? "contact_created"
        : trigger.type === "contact_field_changed"
          ? "contact_field_changed"
          : "manual"

  return {
    id: createRuntimeStepId("trigger_start", usedIds),
    type: "trigger",
    label: "Trigger",
    config: {
      triggerType,
      ...(trigger.type === "contact_field_changed"
        ? { watchedFields: trigger.watchedFields }
        : {}),
      ...(trigger.initialStatus ? { initialStatus: trigger.initialStatus } : {}),
    },
  }
}

function compileStandardStep(
  step: StandardStepV2,
  usedIds: Set<string>,
  allowedStatuses: Set<string>
): CompileChunk {
  const runtimeSteps: WorkflowStep[] = []
  const taskActionStepMap = new Map<string, { runtimeStepId: string; dueDays?: number }>()

  for (let actionIndex = 0; actionIndex < step.actions.length; actionIndex++) {
    const action = step.actions[actionIndex]

    const actionStepId = createRuntimeStepId(
      action.id || `${step.id}__action_${actionIndex + 1}`,
      usedIds
    )

    if (action.type === "create_task") {
      runtimeSteps.push({
        id: actionStepId,
        type: "assign_task",
        label: `${step.name}: Create Task`,
        phaseId: step.phaseId,
        config: {
          title: convertValueTemplate(action.config.title),
          description: action.config.description
            ? convertValueTemplate(action.config.description)
            : undefined,
          links:
            action.config.links
              ?.map((link) => convertValueTemplate(link))
              .filter((link) => link.trim().length > 0) ?? [],
          taskType: action.config.taskType,
          assignTo: action.config.assignTo,
          priority: action.config.priority,
          dueDays: action.config.dueDays,
        },
      })
      taskActionStepMap.set(action.id, {
        runtimeStepId: actionStepId,
        dueDays: action.config.dueDays,
      })
      continue
    }

    if (action.type === "send_email") {
      runtimeSteps.push({
        id: actionStepId,
        type: "send_email",
        label: `${step.name}: Send Email`,
        phaseId: step.phaseId,
        config: {
          to: convertValueTemplate(action.config.to),
          subject: convertValueTemplate(action.config.subject),
          body: convertValueTemplate(action.config.body),
        },
      })
      continue
    }

    if (action.type === "notification") {
      runtimeSteps.push({
        id: actionStepId,
        type: "notification",
        label: `${step.name}: Notification`,
        phaseId: step.phaseId,
        config: {
          recipients:
            action.config.recipients.type === "user"
              ? {
                  type: "user",
                  userId: convertValueTemplate(action.config.recipients.userId),
                }
              : action.config.recipients.type === "role"
                ? {
                    type: "role",
                    role: convertValueTemplate(action.config.recipients.role),
                  }
                : action.config.recipients.type === "group"
                  ? {
                      type: "group",
                      groupIds: action.config.recipients.groupIds.map((groupId) =>
                        convertValueTemplate(groupId)
                      ),
                    }
                  : { type: "organization" },
          title: convertValueTemplate(action.config.title),
          message: convertValueTemplate(action.config.message),
        },
      })
      continue
    }

    if (action.type === "update_contact") {
      runtimeSteps.push({
        id: actionStepId,
        type: "update_contact",
        label: `${step.name}: Update Contact`,
        phaseId: step.phaseId,
        config: {
          fields: action.config.fields.map((field) => ({
            field: field.field,
            value: convertValueTemplate(field.value),
          })),
        },
      })
      continue
    }

    if (action.type === "update_status") {
      if (allowedStatuses.size > 0 && !allowedStatuses.has(action.config.status)) {
        throw new AuthoringCompileError([
          {
            code: "invalid_status",
            path: `steps.${step.id}.actions.${action.id}.config.status`,
            message: `Status "${action.config.status}" is not defined on this workflow.`,
          },
        ])
      }

      runtimeSteps.push({
        id: actionStepId,
        type: "update_status",
        label: `${step.name}: Update Status`,
        phaseId: step.phaseId,
        config: {
          status: action.config.status,
        },
      })
      continue
    }
  }

  if (step.advancementCondition.type === "when_task_completed") {
    const taskRef = taskActionStepMap.get(step.advancementCondition.config.taskActionId)
    if (!taskRef) {
      throw new AuthoringCompileError([
        {
          code: "invalid_advancement",
          path: `steps.${step.id}.advancementCondition.config.taskActionId`,
          message:
            "Task advancement must reference a Create Task action in the same step.",
        },
      ])
    }

    runtimeSteps.push({
      id: createRuntimeStepId(`${step.id}__wait_task`, usedIds),
      type: "wait_for_task",
      label: `${step.name}: Wait for Task`,
      phaseId: step.phaseId,
      config: {
        timeoutDays: Math.max(taskRef.dueDays ?? DEFAULT_WAIT_TIMEOUT_DAYS, 1),
      },
    })
  }

  if (step.advancementCondition.type === "when_duration_passes") {
    const delayDuration =
      step.advancementCondition.config.unit === "weeks"
        ? step.advancementCondition.config.duration * 7
        : step.advancementCondition.config.duration
    const delayUnit =
      step.advancementCondition.config.unit === "hours" ? "hours" : "days"

    runtimeSteps.push({
      id: createRuntimeStepId(`${step.id}__delay`, usedIds),
      type: "delay",
      label: `${step.name}: Delay`,
      phaseId: step.phaseId,
      config: {
        duration: delayDuration,
        unit: delayUnit,
      },
    })
  }

  if (runtimeSteps.length === 0) {
    runtimeSteps.push({
      id: createRuntimeStepId(`${step.id}__anchor`, usedIds),
      type: "trigger",
      label: `${step.name}: Anchor`,
      phaseId: step.phaseId,
      config: {
        triggerType: "manual",
      },
    })
  }

  return {
    sourceTopLevelId: step.id,
    startRuntimeStepId: runtimeSteps[0].id,
    runtimeSteps,
    pendingNextTopLevelTargets: [],
  }
}

function compileTrackSteps(
  trackSteps: StandardStepV2[],
  usedIds: Set<string>,
  allowedStatuses: Set<string>
): { steps: WorkflowStep[]; startRuntimeStepId: string } {
  const steps: WorkflowStep[] = []

  for (const trackStep of trackSteps) {
    const chunk = compileStandardStep(trackStep, usedIds, allowedStatuses)
    steps.push(...chunk.runtimeSteps)
  }

  return {
    steps,
    startRuntimeStepId: steps[0].id,
  }
}

function compileBranchStep(
  step: BranchStepV2,
  usedIds: Set<string>,
  allowedStatuses: Set<string>,
  nextTopLevelId?: string
): CompileChunk {
  const trackA = compileTrackSteps(step.tracks[0].steps, usedIds, allowedStatuses)
  const trackB = compileTrackSteps(step.tracks[1].steps, usedIds, allowedStatuses)
  const branchField = normalizeBranchFieldRef(step.condition.variableRef)

  if (!branchField) {
    throw new AuthoringCompileError([
      {
        code: "unsupported_variable_reference",
        path: `steps.${step.id}.condition.variableRef`,
        message:
          "Branch condition variable must be a contact variable reference (for example: var-contact.email).",
      },
    ])
  }

  if (typeof step.condition.compareValue !== "string") {
    throw new AuthoringCompileError([
      {
        code: "invalid_branch",
        path: `steps.${step.id}.condition.compareValue`,
        message: "Branch compare value must be a string.",
      },
    ])
  }

  if (!["equals", "not_equals"].includes(step.condition.operator)) {
    throw new AuthoringCompileError([
      {
        code: "unsupported_advancement",
        path: `steps.${step.id}.condition.operator`,
        message: `Branch operator "${step.condition.operator}" is not supported by runtime compiler.`,
      },
    ])
  }

  const routeOnMatchId =
    step.condition.operator === "equals"
      ? trackA.startRuntimeStepId
      : trackB.startRuntimeStepId
  const routeOnDefaultId =
    step.condition.operator === "equals"
      ? trackB.startRuntimeStepId
      : trackA.startRuntimeStepId

  const conditionStep: ConditionStep = {
    id: createRuntimeStepId(`${step.id}__condition`, usedIds),
    type: "condition",
    label: `${step.name}: Branch`,
    phaseId: step.phaseId,
    config: {
      field: branchField,
      branches: [
        {
          value: step.condition.compareValue,
          gotoStepId: routeOnMatchId,
        },
      ],
      defaultGotoStepId: routeOnDefaultId,
    },
  }

  const runtimeSteps: WorkflowStep[] = [
    conditionStep,
    ...trackA.steps,
  ]

  const pendingNextTopLevelTargets: CompileChunk["pendingNextTopLevelTargets"] = []

  const skipTrackBStep: ConditionStep = {
    id: createRuntimeStepId(`${step.id}__skip_track_b`, usedIds),
    type: "condition",
    label: `${step.name}: Merge`,
    phaseId: step.phaseId,
    config: {
      field: "1",
      branches: [{ value: "1", gotoStepId: "__pending__" }],
    },
  }

  runtimeSteps.push(skipTrackBStep, ...trackB.steps)
  pendingNextTopLevelTargets.push({
    step: skipTrackBStep,
    nextTopLevelId,
  })

  return {
    sourceTopLevelId: step.id,
    startRuntimeStepId: conditionStep.id,
    runtimeSteps,
    pendingNextTopLevelTargets,
  }
}

function normalizeDefinitionStatusesForCompile(
  authoring: WorkflowDefinitionV2,
  definitionStatuses?: DefinitionStatus[]
) {
  const statuses = definitionStatuses?.length
    ? definitionStatuses
    : authoring.statuses ?? []
  return new Set(statuses.map((status) => status.id))
}

export function compileAuthoringToRuntime(
  authoring: WorkflowDefinitionV2,
  options: { definitionStatuses?: DefinitionStatus[] } = {}
): WorkflowStep[] {
  const validationIssues = validateAuthoring(authoring, options)
  if (validationIssues.length > 0) {
    throw new AuthoringCompileError(validationIssues)
  }

  const usedIds = new Set<string>()
  const chunks: CompileChunk[] = []
  const topLevelStartStepByAuthoringId = new Map<string, string>()
  const allowedStatuses = normalizeDefinitionStatusesForCompile(
    authoring,
    options.definitionStatuses
  )

  const triggerStep = createTriggerStep(authoring.trigger, usedIds)

  for (let index = 0; index < authoring.steps.length; index++) {
    const current = authoring.steps[index]
    const nextTopLevelId = authoring.steps[index + 1]?.id
    const chunk = isBranchStep(current)
      ? compileBranchStep(current, usedIds, allowedStatuses, nextTopLevelId)
      : compileStandardStep(current, usedIds, allowedStatuses)
    chunks.push(chunk)
    topLevelStartStepByAuthoringId.set(current.id, chunk.startRuntimeStepId)
  }

  const endStepId = createRuntimeStepId("workflow_end", usedIds)
  const endStep: WorkflowStep = {
    id: endStepId,
    type: "trigger",
    label: "Workflow End",
    config: {
      triggerType: "manual",
    },
  }

  for (const chunk of chunks) {
    for (const pending of chunk.pendingNextTopLevelTargets) {
      const targetStepId = pending.nextTopLevelId
        ? topLevelStartStepByAuthoringId.get(pending.nextTopLevelId) ?? endStepId
        : endStepId
      pending.step.config.branches[0].gotoStepId = targetStepId
    }
  }

  return [
    triggerStep,
    ...chunks.flatMap((chunk) => chunk.runtimeSteps),
    endStep,
  ]
}

export function persistableAuthoringPayload(authoring: WorkflowDefinitionV2) {
  return {
    [AUTHORING_STORAGE_KEY]: {
      schemaVersion: 1,
      workflow: {
        trigger: authoring.trigger,
        contactRequired: authoring.contactRequired,
        steps: authoring.steps,
        phases: authoring.phases,
        variables: authoring.variables,
      },
    } satisfies PersistedAuthoringPayload,
  }
}

export function definitionPhasesFromAuthoring(
  authoring: WorkflowDefinitionV2
): WorkflowPhase[] {
  return toDefinitionPhases(authoring.phases)
}
