"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { DataTable } from "@/components/data-table/data-table"
import { createDefinitionColumns } from "@/components/data-table/columns/definition-columns"
import { DefinitionCreateDialog } from "@/components/workflow-builder/definition-create-dialog"
import { BuilderModal } from "@/components/workflow-builder/builder-modal"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import type { WorkflowDefinition } from "@/types"

export function WorkflowBuilderContent() {
  const { toast } = useToast()
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedDefinition, setSelectedDefinition] =
    useState<WorkflowDefinition | null>(null)
  const [builderModalOpen, setBuilderModalOpen] = useState(false)

  // Fetch definitions on mount
  useEffect(() => {
    async function fetchDefinitions() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const response = await fetch("/api/workflow-definitions?full=true")
        if (!response.ok) throw new Error("Failed to load definitions")
        const data = await response.json()
        setDefinitions(data.definitions ?? [])
      } catch (error) {
        console.error("Error fetching definitions:", error)
        setLoadError("Unable to load workflow blueprints.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchDefinitions()
  }, [])

  // Create
  const handleCreate = useCallback(
    async (data: { name: string; description: string }) => {
      try {
        const response = await fetch("/api/workflow-definitions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error("Failed to create definition")
        const { definition } = await response.json()
        setDefinitions((prev) => [definition, ...prev])
        setSelectedDefinition(definition)
        setBuilderModalOpen(true)
        toast({ title: "Blueprint created", description: `"${definition.name}" is ready to edit.` })
      } catch (error) {
        console.error("Error creating definition:", error)
        toast({
          title: "Error",
          description: "Failed to create blueprint. Please try again.",
          variant: "destructive",
        })
      }
    },
    [toast]
  )

  // Edit (row click or dropdown)
  const handleEdit = useCallback((definition: WorkflowDefinition) => {
    setSelectedDefinition(definition)
    setBuilderModalOpen(true)
  }, [])

  // Save from builder modal (PATCH)
  const handleSave = useCallback(
    async (updated: WorkflowDefinition) => {
      try {
        const response = await fetch(
          `/api/workflow-definitions/${updated.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: updated.name,
              description: updated.description,
              steps: updated.steps,
              phases: updated.phases,
            }),
          }
        )
        if (!response.ok) throw new Error("Failed to save definition")
        const { definition: newVersion } = await response.json()

        // Replace old version with new (immutable versioning returns new row)
        setDefinitions((prev) =>
          prev.map((d) => (d.id === updated.id ? newVersion : d))
        )
        setSelectedDefinition(newVersion)
        toast({ title: "Blueprint saved", description: `v${newVersion.version} saved.` })
      } catch (error) {
        console.error("Error saving definition:", error)
        toast({
          title: "Error",
          description: "Failed to save blueprint. Please try again.",
          variant: "destructive",
        })
      }
    },
    [toast]
  )

  // Delete
  const handleDelete = useCallback(
    async (definition: WorkflowDefinition) => {
      try {
        const response = await fetch(
          `/api/workflow-definitions/${definition.id}`,
          { method: "DELETE" }
        )
        if (!response.ok) throw new Error("Failed to delete definition")
        setDefinitions((prev) => prev.filter((d) => d.id !== definition.id))
        toast({ title: "Blueprint deleted" })
      } catch (error) {
        console.error("Error deleting definition:", error)
        toast({
          title: "Error",
          description: "Failed to delete blueprint. Please try again.",
          variant: "destructive",
        })
      }
    },
    [toast]
  )

  const columns = useMemo(
    () => createDefinitionColumns({ onEdit: handleEdit, onDelete: handleDelete }),
    [handleEdit, handleDelete]
  )

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Workflow Blueprints
          </h1>
          <p className="text-muted-foreground">
            Create and manage reusable workflow definitions.
          </p>
        </div>
        <DefinitionCreateDialog onCreate={handleCreate} />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {!isLoading && !loadError && (
        <DataTable
          columns={columns}
          data={definitions}
          searchKey="name"
          searchPlaceholder="Search blueprints..."
          onRowClick={(row) => handleEdit(row.original)}
        />
      )}

      <BuilderModal
        key={selectedDefinition ? `${selectedDefinition.id}:${selectedDefinition.version}` : "builder-modal-none"}
        definition={selectedDefinition}
        open={builderModalOpen}
        onOpenChange={setBuilderModalOpen}
        onSave={handleSave}
      />
    </div>
  )
}
