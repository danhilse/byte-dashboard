"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { ArrowRight, GitBranch, Search } from "lucide-react"
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
import { WorkflowDefinitionCreateDialog } from "@/components/workflow-builder/workflow-definition-create-dialog"
import type { DefinitionStatus, WorkflowDefinition } from "@/types"

export interface WorkflowDefinitionListItem {
  id: string
  name: string
  description?: string
  version: number
  statuses: DefinitionStatus[]
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
    isActive: definition.isActive,
    createdAt: definition.createdAt,
    updatedAt: definition.updatedAt,
  }
}

export function WorkflowDefinitionsIndex({ initialDefinitions }: WorkflowDefinitionsIndexProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [definitions, setDefinitions] = useState<WorkflowDefinitionListItem[]>(
    sortByUpdatedAt(initialDefinitions)
  )

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
                  <TableHead>Statuses</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Open</TableHead>
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
                        {definition.statuses.length}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/workflow-builder/${definition.id}`)}
                      >
                        Open
                        <ArrowRight className="ml-1 size-4" />
                      </Button>
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
    </div>
  )
}
