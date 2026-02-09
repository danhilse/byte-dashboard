"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

import { WorkflowBuilderV2 } from "@/components/workflow-builder/v2/workflow-builder-v2"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import type { DefinitionStatus } from "@/types"
import type {
  WorkflowDefinitionV2,
  WorkflowPhase,
  WorkflowStepV2,
  WorkflowTrigger,
  WorkflowVariable,
} from "@/components/workflow-builder/types/workflow-v2"

const AUTHORING_STORAGE_KEY = "__builderV2Authoring"

interface PersistedAuthoringPayload {
  schemaVersion: number
  workflow: {
    trigger?: WorkflowTrigger
    contactRequired?: boolean
    steps?: WorkflowStepV2[]
    phases?: WorkflowPhase[]
    variables?: WorkflowVariable[]
  }
}

interface WorkflowDefinitionRecord {
  id: string
  name: string
  description?: string | null
  version: number
  phases?: unknown
  steps?: unknown
  variables?: unknown
  statuses?: unknown
  createdAt: string
  updatedAt: string
}

interface WorkflowDefinitionEditorProps {
  definitionId: string
  initialDefinition: WorkflowDefinitionRecord
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function normalizeStatuses(value: unknown): DefinitionStatus[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((status): status is DefinitionStatus => {
      if (!isRecord(status)) {
        return false
      }

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
      color: status.color?.trim() || undefined,
    }))
    .sort((a, b) => a.order - b.order)
}

function normalizePhases(value: unknown): WorkflowPhase[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isRecord)
    .map((phase, index) => {
      const id = typeof phase.id === "string" && phase.id ? phase.id : `phase_${index + 1}`
      const name =
        (typeof phase.name === "string" && phase.name) ||
        (typeof phase.label === "string" && phase.label) ||
        `Phase ${index + 1}`
      const color = typeof phase.color === "string" ? phase.color : undefined
      const order =
        typeof phase.order === "number" && Number.isFinite(phase.order)
          ? phase.order
          : index

      return { id, name, color, order }
    })
    .sort((a, b) => a.order - b.order)
}

function isLikelyWorkflowStepV2Array(value: unknown): value is WorkflowStepV2[] {
  if (!Array.isArray(value)) {
    return false
  }

  return value.every((step) => {
    if (!isRecord(step)) {
      return false
    }

    return (
      typeof step.id === "string" &&
      typeof step.name === "string" &&
      Array.isArray(step.actions) &&
      isRecord(step.advancementCondition)
    )
  })
}

function normalizeVariables(value: unknown): WorkflowVariable[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((variable): variable is WorkflowVariable => {
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

function readPersistedAuthoring(
  variables: unknown
): PersistedAuthoringPayload | null {
  if (!isRecord(variables)) {
    return null
  }

  const raw = variables[AUTHORING_STORAGE_KEY]
  if (!isRecord(raw) || !isRecord(raw.workflow)) {
    return null
  }

  return raw as PersistedAuthoringPayload
}

function toEditorWorkflow(definition: WorkflowDefinitionRecord): WorkflowDefinitionV2 {
  const persistedAuthoring = readPersistedAuthoring(definition.variables)
  const statuses = normalizeStatuses(definition.statuses)
  const defaultTrigger: WorkflowTrigger = { type: "manual" }

  const authoringSteps = persistedAuthoring?.workflow.steps
  const steps = Array.isArray(authoringSteps)
    ? authoringSteps
    : isLikelyWorkflowStepV2Array(definition.steps)
      ? definition.steps
      : []

  const authoringVariables = persistedAuthoring?.workflow.variables
  const variables = Array.isArray(authoringVariables)
    ? authoringVariables
    : normalizeVariables(definition.variables)

  const authoringPhases = persistedAuthoring?.workflow.phases
  const phases = Array.isArray(authoringPhases)
    ? authoringPhases
    : normalizePhases(definition.phases)

  const trigger = persistedAuthoring?.workflow.trigger ?? defaultTrigger
  const contactRequired =
    typeof persistedAuthoring?.workflow.contactRequired === "boolean"
      ? persistedAuthoring.workflow.contactRequired
      : true

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description ?? undefined,
    trigger,
    contactRequired,
    steps,
    phases,
    statuses,
    variables,
    createdAt: definition.createdAt,
    updatedAt: definition.updatedAt,
  }
}

function toDefinitionPhases(phases: WorkflowPhase[]) {
  return phases.map((phase, index) => ({
    id: phase.id,
    label: phase.name,
    order: typeof phase.order === "number" ? phase.order : index,
  }))
}

export function WorkflowDefinitionEditor({
  definitionId,
  initialDefinition,
}: WorkflowDefinitionEditorProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [activeDefinitionId, setActiveDefinitionId] = useState(definitionId)
  const [definitionRecord, setDefinitionRecord] =
    useState<WorkflowDefinitionRecord>(initialDefinition)
  const [workflow, setWorkflow] = useState<WorkflowDefinitionV2>(
    toEditorWorkflow(initialDefinition)
  )
  const [savedSnapshot, setSavedSnapshot] = useState(
    JSON.stringify(toEditorWorkflow(initialDefinition))
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const workflowSnapshot = useMemo(() => JSON.stringify(workflow), [workflow])
  const isDirty = workflowSnapshot !== savedSnapshot

  const hydrateFromRecord = useCallback((record: WorkflowDefinitionRecord) => {
    const nextWorkflow = toEditorWorkflow(record)
    setDefinitionRecord(record)
    setWorkflow(nextWorkflow)
    setSavedSnapshot(JSON.stringify(nextWorkflow))
  }, [])

  const fetchDefinition = useCallback(
    async (id: string) => {
      setIsLoading(true)
      setLoadError(null)

      try {
        const response = await fetch(`/api/workflow-definitions/${id}`)
        const payload = await response.json().catch(() => null)

        if (!response.ok || !payload?.definition) {
          throw new Error(payload?.error || "Failed to load workflow definition")
        }

        hydrateFromRecord(payload.definition as WorkflowDefinitionRecord)
        setActiveDefinitionId(payload.definition.id)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load definition."
        setLoadError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [hydrateFromRecord]
  )

  useEffect(() => {
    setActiveDefinitionId(definitionId)
    fetchDefinition(definitionId)
  }, [definitionId, fetchDefinition])

  const handleSave = useCallback(
    async (nextWorkflow: WorkflowDefinitionV2) => {
      setIsSaving(true)

      try {
        const variableRecord = isRecord(definitionRecord.variables)
          ? definitionRecord.variables
          : {}

        const response = await fetch(
          `/api/workflow-definitions/${activeDefinitionId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: nextWorkflow.name,
              description: nextWorkflow.description ?? null,
              statuses: nextWorkflow.statuses,
              phases: toDefinitionPhases(nextWorkflow.phases),
              variables: {
                ...variableRecord,
                [AUTHORING_STORAGE_KEY]: {
                  schemaVersion: 1,
                  workflow: {
                    trigger: nextWorkflow.trigger,
                    contactRequired: nextWorkflow.contactRequired,
                    steps: nextWorkflow.steps,
                    phases: nextWorkflow.phases,
                    variables: nextWorkflow.variables,
                  },
                } satisfies PersistedAuthoringPayload,
              },
            }),
          }
        )

        const payload = await response.json().catch(() => null)

        if (!response.ok || !payload?.definition) {
          throw new Error(payload?.error || "Failed to save workflow definition")
        }

        const updated = payload.definition as WorkflowDefinitionRecord
        hydrateFromRecord(updated)

        const previousId = activeDefinitionId
        const nextId = updated.id
        setActiveDefinitionId(nextId)

        toast({
          title: "Definition saved",
          description: `Saved as version ${updated.version}.`,
        })

        if (nextId !== previousId) {
          router.replace(`/admin/workflow-builder/${nextId}`)
        }
        router.refresh()
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to save workflow definition.",
          variant: "destructive",
        })
      } finally {
        setIsSaving(false)
      }
    },
    [activeDefinitionId, definitionRecord.variables, hydrateFromRecord, router, toast]
  )

  if (loadError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to load workflow definition</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="mb-3">{loadError}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDefinition(activeDefinitionId)}
            >
              <RefreshCw className="mr-2 size-4" />
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoading && !workflow) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[520px] w-full" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <WorkflowBuilderV2
        workflow={workflow}
        onWorkflowChange={setWorkflow}
        onSave={handleSave}
        isSaving={isSaving}
        saveDisabled={isLoading || !isDirty}
      />
    </div>
  )
}
