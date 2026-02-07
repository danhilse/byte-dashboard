"use client"

import { GenericKanbanBoard, type KanbanColumn } from "./generic-kanban-board"
import { KanbanCard } from "./kanban-card"
import type { Task, TaskStatus } from "@/types"

interface KanbanBoardProps {
  tasks: Task[]
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void
  onTaskClick?: (task: Task) => void
}

const columns: KanbanColumn<TaskStatus>[] = [
  { id: "backlog", title: "Backlog", color: "border-t-slate-500" },
  { id: "todo", title: "To Do", color: "border-t-blue-500" },
  { id: "in_progress", title: "In Progress", color: "border-t-yellow-500" },
  { id: "done", title: "Done", color: "border-t-green-500" },
]

export function KanbanBoard({ tasks, onStatusChange, onTaskClick }: KanbanBoardProps) {
  return (
    <GenericKanbanBoard
      items={tasks}
      columns={columns}
      getItemStatus={(task) => task.status}
      setItemStatus={(task, status) => ({ ...task, status })}
      renderCard={(task, props) => (
        <KanbanCard key={task.id} task={task} className={props?.className} />
      )}
      renderOverlayCard={(task) => <KanbanCard task={task} />}
      onStatusChange={onStatusChange}
      onItemClick={onTaskClick}
      enableReordering={true}
      emptyStateText="Drop tasks here"
    />
  )
}
