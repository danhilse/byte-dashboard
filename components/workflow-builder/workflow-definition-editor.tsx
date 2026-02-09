"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

import { WorkflowBuilderV2 } from "@/components/workflow-builder/v2/workflow-builder-v2"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  definitionPhasesFromAuthoring,
  fromDefinitionToAuthoring,
  persistableAuthoringPayload,
  type DefinitionRecordLike,
} from "@/lib/workflow-builder-v2/adapters/definition-runtime-adapter"
import type { WorkflowDefinitionV2 } from "@/components/workflow-builder/types/workflow-v2"

interface WorkflowDefinitionRecord extends DefinitionRecordLike {
  version: number
}

interface WorkflowDefinitionEditorProps {
  definitionId: string
  initialDefinition: WorkflowDefinitionRecord
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function collectSaveErrors(payload: unknown): string[] {
  if (!isRecord(payload) || !Array.isArray(payload.details)) {
    return []
  }

  return payload.details.filter(
    (detail): detail is string => typeof detail === "string" && detail.length > 0
  )
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
    fromDefinitionToAuthoring(initialDefinition)
  )
  const [savedSnapshot, setSavedSnapshot] = useState(
    JSON.stringify(fromDefinitionToAuthoring(initialDefinition))
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveErrors, setSaveErrors] = useState<string[]>([])

  const workflowSnapshot = useMemo(() => JSON.stringify(workflow), [workflow])
  const isDirty = workflowSnapshot !== savedSnapshot

  const hydrateFromRecord = useCallback((record: WorkflowDefinitionRecord) => {
    const nextWorkflow = fromDefinitionToAuthoring(record)
    setDefinitionRecord(record)
    setWorkflow(nextWorkflow)
    setSavedSnapshot(JSON.stringify(nextWorkflow))
    setSaveErrors([])
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
      setSaveErrors([])

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
              phases: definitionPhasesFromAuthoring(nextWorkflow),
              variables: {
                ...variableRecord,
                ...persistableAuthoringPayload(nextWorkflow),
              },
            }),
          }
        )

        const payload = await response.json().catch(() => null)

        if (!response.ok || !payload?.definition) {
          const details = collectSaveErrors(payload)
          if (details.length > 0) {
            setSaveErrors(details)
          }

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

  return (
    <div className="h-[calc(100vh-4rem)]">
      {saveErrors.length > 0 && (
        <div className="border-b p-4">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Definition cannot be saved yet</AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-4">
                {saveErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      )}

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
