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
  { id: "running", title: "Running", color: "border-t-cyan-500" },
  { id: "completed", title: "Completed", color: "border-t-emerald-500" },
  { id: "failed", title: "Failed", color: "border-t-rose-500" },
  { id: "timeout", title: "Timed Out", color: "border-t-amber-500" },
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
      gridClassName="grid h-[calc(100vh-14rem)] auto-cols-[minmax(180px,1fr)] grid-flow-col gap-4 overflow-x-auto"
      emptyStateText="Drop workflows here"
    />
  )
}
