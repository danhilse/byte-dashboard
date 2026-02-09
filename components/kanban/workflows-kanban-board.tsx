"use client"

import { useMemo } from "react"
import { GenericKanbanBoard, type KanbanColumn } from "./generic-kanban-board"
import { WorkflowKanbanCard } from "./workflow-kanban-card"
import { resolveWorkflowStatusDisplay } from "@/lib/status-config"
import type { Workflow, DefinitionStatus } from "@/types"

interface WorkflowsKanbanBoardProps {
  workflows: Workflow[]
  definitionStatuses?: DefinitionStatus[]
  onStatusChange?: (workflowId: string, newStatus: string) => void
  onWorkflowClick?: (workflow: Workflow) => void
}

const fallbackColumns: KanbanColumn<string>[] = [
  { id: "draft", title: "Draft", color: "border-t-slate-500" },
  { id: "in_review", title: "In Review", color: "border-t-blue-500" },
  { id: "pending", title: "Pending", color: "border-t-yellow-500" },
  { id: "on_hold", title: "On Hold", color: "border-t-orange-500" },
  { id: "approved", title: "Approved", color: "border-t-green-500" },
  { id: "rejected", title: "Rejected", color: "border-t-red-500" },
  { id: "running", title: "Running", color: "border-t-cyan-500" },
  { id: "completed", title: "Completed", color: "border-t-emerald-500" },
  { id: "failed", title: "Failed", color: "border-t-rose-500" },
  { id: "timeout", title: "Timed Out", color: "border-t-amber-500" },
]

export function WorkflowsKanbanBoard({
  workflows,
  definitionStatuses,
  onStatusChange,
  onWorkflowClick,
}: WorkflowsKanbanBoardProps) {
  const columns = useMemo<KanbanColumn<string>[]>(() => {
    if (definitionStatuses?.length) {
      const baseColumns = [...definitionStatuses]
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          id: s.id,
          title: s.label,
          borderColorHex: s.color,
        }))

      // Keep unknown/existing statuses visible even if a definition changed.
      const knownStatusIds = new Set(baseColumns.map((column) => column.id))
      const extraColumns = [...new Set(workflows.map((workflow) => workflow.status))]
        .filter((statusId) => !knownStatusIds.has(statusId))
        .map((statusId) => {
          const display = resolveWorkflowStatusDisplay(statusId, definitionStatuses)
          return {
            id: statusId,
            title: display.label,
          }
        })

      return [...baseColumns, ...extraColumns]
    }
    return fallbackColumns
  }, [definitionStatuses, workflows])

  return (
    <GenericKanbanBoard
      items={workflows}
      columns={columns}
      getItemStatus={(workflow) => workflow.status}
      setItemStatus={(workflow, status) => ({ ...workflow, status })}
      renderCard={(workflow, props) => (
        <WorkflowKanbanCard
          key={workflow.id}
          workflow={workflow}
          definitionStatuses={definitionStatuses}
          isDraggable={!workflow.temporalWorkflowId}
          onClick={props?.onClick}
          className={props?.className}
        />
      )}
      renderOverlayCard={(workflow) => (
        <WorkflowKanbanCard workflow={workflow} definitionStatuses={definitionStatuses} />
      )}
      onStatusChange={onStatusChange}
      onItemClick={onWorkflowClick}
      gridClassName="grid h-[calc(100vh-14rem)] auto-cols-[minmax(200px,1fr)] grid-flow-col gap-4 overflow-x-auto"
      emptyStateText="Drop workflows here"
    />
  )
}
