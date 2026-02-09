import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WorkflowPhase, WorkflowStep, DefinitionStatus } from "@/types"

interface PhaseProgressStepperProps {
  phases: WorkflowPhase[]
  steps: WorkflowStep[]
  currentStepId?: string | null
  currentPhaseId?: string | null
  workflowStatus?: string
  definitionStatuses?: DefinitionStatus[]
}

type PhaseState = "completed" | "current" | "upcoming"

const TERMINAL_COMPLETED_STATUSES = new Set<string>([
  "completed",
  "approved",
  "rejected",
  "timeout",
])

function getPhaseStates(
  phases: WorkflowPhase[],
  steps: WorkflowStep[],
  currentStepId?: string | null,
  explicitCurrentPhaseId?: string | null,
  workflowStatus?: string,
  definitionStatuses?: DefinitionStatus[]
): PhaseState[] {
  if (!phases.length) return []

  const lastDefinitionStatusId = definitionStatuses?.length
    ? [...definitionStatuses].sort((a, b) => a.order - b.order).at(-1)?.id
    : null

  // Terminal successful/ended statuses treat all phases as complete.
  if (
    workflowStatus &&
    (TERMINAL_COMPLETED_STATUSES.has(workflowStatus) ||
      workflowStatus === lastDefinitionStatusId)
  ) {
    return phases.map(() => "completed")
  }

  // Find which phase the current step belongs to
  const currentStep = currentStepId
    ? steps.find((s) => s.id === currentStepId)
    : null
  const currentPhaseId = currentStep?.phaseId ?? explicitCurrentPhaseId

  if (!currentPhaseId) {
    // No current phase — all upcoming
    return phases.map(() => "upcoming")
  }

  const currentPhaseIndex = phases.findIndex((p) => p.id === currentPhaseId)
  if (currentPhaseIndex === -1) {
    return phases.map(() => "upcoming")
  }

  return phases.map((_, i) => {
    if (i < currentPhaseIndex) return "completed"
    if (i === currentPhaseIndex) return "current"
    return "upcoming"
  })
}

export function PhaseProgressStepper({
  phases,
  steps,
  currentStepId,
  currentPhaseId,
  workflowStatus,
  definitionStatuses,
}: PhaseProgressStepperProps) {
  if (!phases.length) return null

  const states = getPhaseStates(
    phases,
    steps,
    currentStepId,
    currentPhaseId,
    workflowStatus,
    definitionStatuses
  )
  const isFailed = workflowStatus === "failed"

  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto py-2">
      {phases.map((phase, i) => {
        const state = states[i]

        return (
          <div key={phase.id} className="flex items-center flex-1 min-w-0">
            {/* Connector line before (except first) */}
            {i > 0 && (
              <div
                className={cn(
                  "h-0.5 flex-1 min-w-4",
                  state === "upcoming"
                    ? "bg-muted"
                    : isFailed && state === "current"
                      ? "bg-destructive/50"
                      : "bg-primary"
                )}
              />
            )}

            {/* Circle indicator */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-xs font-medium border-2 transition-colors",
                  state === "completed" &&
                    "border-primary bg-primary text-primary-foreground",
                  state === "current" &&
                    !isFailed &&
                    "border-primary bg-primary/10 text-primary",
                  state === "current" &&
                    isFailed &&
                    "border-destructive bg-destructive/10 text-destructive",
                  state === "upcoming" &&
                    "border-muted bg-background text-muted-foreground"
                )}
              >
                {state === "completed" ? (
                  <Check className="size-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs text-center max-w-20 truncate",
                  state === "current" && !isFailed && "font-medium text-primary",
                  state === "current" && isFailed && "font-medium text-destructive",
                  state === "completed" && "text-muted-foreground",
                  state === "upcoming" && "text-muted-foreground"
                )}
                title={phase.label}
              >
                {phase.label}
              </span>
            </div>

            {/* Connector line after (except last) */}
            {i < phases.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 min-w-4",
                  states[i + 1] === "upcoming"
                    ? "bg-muted"
                    : "bg-primary"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
