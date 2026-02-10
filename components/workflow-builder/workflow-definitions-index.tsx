"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { ArrowRight, Copy, GitBranch, MoreHorizontal, Search, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { EmptyState } from "@/components/common/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { WorkflowDefinitionCreateDialog } from "@/components/workflow-builder/workflow-definition-create-dialog"
import { useToast } from "@/hooks/use-toast"
import type { DefinitionStatus, WorkflowDefinition } from "@/types"

export interface WorkflowDefinitionListItem {
  id: string
  name: string
  description?: string
  version: number
  statuses: DefinitionStatus[]
  runsCount: number
  isActive: boolean
  updatedAt: string
  createdAt: string
}

interface WorkflowDefinitionsIndexProps {
  initialDefinitions: WorkflowDefinitionListItem[]
}

function sortByUpdatedAt(definitions: WorkflowDefinitionListItem[]) {
  return [...definitions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

function toListItem(definition: WorkflowDefinition): WorkflowDefinitionListItem {
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description ?? undefined,
    version: definition.version,
    statuses: Array.isArray(definition.statuses) ? definition.statuses : [],
    runsCount: 0,
    isActive: definition.isActive,
    createdAt: definition.createdAt,
    updatedAt: definition.updatedAt,
  }
}

export function WorkflowDefinitionsIndex({ initialDefinitions }: WorkflowDefinitionsIndexProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [definitions, setDefinitions] = useState<WorkflowDefinitionListItem[]>(
    sortByUpdatedAt(initialDefinitions)
  )
  const [definitionPendingDelete, setDefinitionPendingDelete] =
    useState<WorkflowDefinitionListItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [duplicatingDefinitionId, setDuplicatingDefinitionId] = useState<string | null>(null)

  const filteredDefinitions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return definitions
    }

    return definitions.filter((definition) => {
      const description = definition.description?.toLowerCase() ?? ""
      return (
        definition.name.toLowerCase().includes(query) ||
        description.includes(query)
      )
    })
  }, [definitions, searchQuery])

  const handleDefinitionCreated = (definition: WorkflowDefinition) => {
    const item = toListItem(definition)
    setDefinitions((prev) => sortByUpdatedAt([item, ...prev]))
    router.push(`/admin/workflow-builder/${definition.id}`)
  }

  const handleDeleteDefinition = async () => {
    if (!definitionPendingDelete) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(
        `/api/workflow-definitions/${definitionPendingDelete.id}`,
        {
          method: "DELETE",
        }
      )
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          payload?.error || "Failed to delete workflow definition"
        )
      }

      const deletedExecutions =
        typeof payload?.deletedExecutions === "number"
          ? payload.deletedExecutions
          : 0
      const deletedTasks =
        typeof payload?.deletedTasks === "number" ? payload.deletedTasks : 0

      setDefinitions((prev) =>
        prev.filter((definition) => definition.id !== definitionPendingDelete.id)
      )
      setDefinitionPendingDelete(null)

      toast({
        title: "Definition deleted",
        description: `Deleted ${deletedExecutions} execution(s) and ${deletedTasks} task(s).`,
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete workflow definition.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDuplicateDefinition = async (definition: WorkflowDefinitionListItem) => {
    if (duplicatingDefinitionId) {
      return
    }

    const existingNames = new Set(
      definitions.map((item) => item.name.trim().toLowerCase())
    )
    const baseCopyName = `${definition.name} (Copy)`

    let duplicateName = baseCopyName
    if (existingNames.has(baseCopyName.toLowerCase())) {
      let copyNumber = 2
      while (
        existingNames.has(`${definition.name} (Copy ${copyNumber})`.toLowerCase())
      ) {
        copyNumber += 1
      }
      duplicateName = `${definition.name} (Copy ${copyNumber})`
    }

    setDuplicatingDefinitionId(definition.id)

    try {
      const response = await fetch("/api/workflow-definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: duplicateName,
          sourceDefinitionId: definition.id,
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to duplicate workflow definition")
      }

      const duplicatedDefinition = payload?.definition as WorkflowDefinition | undefined
      if (!duplicatedDefinition) {
        throw new Error("Invalid API response while duplicating workflow definition")
      }

      setDefinitions((prev) => sortByUpdatedAt([toListItem(duplicatedDefinition), ...prev]))

      toast({
        title: "Definition duplicated",
        description: `Created ${duplicatedDefinition.name}.`,
      })

      router.push(`/admin/workflow-builder/${duplicatedDefinition.id}`)
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to duplicate workflow definition.",
        variant: "destructive",
      })
    } finally {
      setDuplicatingDefinitionId(null)
    }
  }

  const hasDefinitions = filteredDefinitions.length > 0

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflow Builder</h1>
          <p className="text-muted-foreground">
            Manage workflow definitions and open the inline editor.
          </p>
        </div>
        <WorkflowDefinitionCreateDialog onDefinitionCreated={handleDefinitionCreated} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Definitions</CardTitle>
              <CardDescription>
                {definitions.length} active definition{definitions.length === 1 ? "" : "s"}
              </CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search definitions..."
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasDefinitions ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Runs</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDefinitions.map((definition) => (
                  <TableRow key={definition.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{definition.name}</p>
                        {definition.description && (
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {definition.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">v{definition.version}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {definition.runsCount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(definition.updatedAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={definition.isActive ? "default" : "outline"}>
                        {definition.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" className="size-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              router.push(`/admin/workflow-builder/${definition.id}`)
                            }}
                          >
                            <ArrowRight className="mr-2 size-4" />
                            Open editor
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              void handleDuplicateDefinition(definition)
                            }}
                            disabled={duplicatingDefinitionId !== null}
                          >
                            <Copy className="mr-2 size-4" />
                            {duplicatingDefinitionId === definition.id
                              ? "Duplicating..."
                              : "Duplicate definition"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setDefinitionPendingDelete(definition)
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 size-4" />
                            Delete definition
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={GitBranch}
              message={
                definitions.length === 0
                  ? "No workflow definitions yet."
                  : "No definitions match your search."
              }
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(definitionPendingDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDefinitionPendingDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow Definition</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {definitionPendingDelete?.name}
              </span>
              ? This will permanently delete the definition, all executions
              created from it, and all tasks generated by those executions.
            </AlertDialogDescription>
            <AlertDialogDescription className="mt-2 text-destructive">
              Any Temporal executions linked to this definition will be
              terminated before deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteDefinition()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Definition"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
