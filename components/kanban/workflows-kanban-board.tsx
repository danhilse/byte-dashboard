"use client"

import { GenericKanbanBoard, type KanbanColumn } from "./generic-kanban-board"
import { WorkflowKanbanCard } from "./workflow-kanban-card"
import type { Workflow, WorkflowStatus } from "@/types"

interface WorkflowsKanbanBoardProps {
  workflows: Workflow[]
  onStatusChange?: (workflowId: string, newStatus: WorkflowStatus) => void
  onWorkflowClick?: (workflow: Workflow) => void
}

const columns: KanbanColumn<WorkflowStatus>[] = [
  { id: "draft", title: "Draft", color: "border-t-slate-500" },
  { id: "in_review", title: "In Review", color: "border-t-blue-500" },
  { id: "pending", title: "Pending", color: "border-t-yellow-500" },
  { id: "on_hold", title: "On Hold", color: "border-t-orange-500" },
  { id: "approved", title: "Approved", color: "border-t-green-500" },
  { id: "rejected", title: "Rejected", color: "border-t-red-500" },
]

export function WorkflowsKanbanBoard({
  workflows,
  onStatusChange,
  onWorkflowClick,
}: WorkflowsKanbanBoardProps) {
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
          onClick={props?.onClick}
          className={props?.className}
        />
      )}
      renderOverlayCard={(workflow) => <WorkflowKanbanCard workflow={workflow} />}
      onStatusChange={onStatusChange}
      onItemClick={onWorkflowClick}
      gridClassName="grid h-[calc(100vh-14rem)] grid-cols-6 gap-4"
      emptyStateText="Drop workflows here"
    />
  )
}
