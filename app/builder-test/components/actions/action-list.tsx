"use client"

import { useState } from "react"
import type { WorkflowAction, ActionType, WorkflowVariable, WorkflowStatus } from "../../types/workflow-v2"
import { ActionCard } from "./action-card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus } from "lucide-react"
import {
  getActionsByCategory,
  actionCategories,
} from "@/lib/workflow-builder-v2/action-registry"

interface ActionListProps {
  actions: WorkflowAction[]
  variables: WorkflowVariable[]
  statuses: WorkflowStatus[]
  onChange: (actions: WorkflowAction[]) => void
  onAddVariable?: (variable: WorkflowVariable) => void
}

export function ActionList({ actions, variables, statuses, onChange, onAddVariable }: ActionListProps) {
  const [expandedActionId, setExpandedActionId] = useState<string | null>(
    actions[0]?.id || null
  )

  const handleAddAction = (type: ActionType) => {
    const actionsByCategory = getActionsByCategory()
    const metadata = Object.values(actionsByCategory)
      .flat()
      .find((a) => a.type === type)

    if (!metadata) return

    const newAction: WorkflowAction = {
      ...metadata.defaultConfig,
      id: `action-${Date.now()}`,
    } as WorkflowAction

    onChange([...actions, newAction])
    setExpandedActionId(newAction.id)
  }

  const handleUpdateAction = (updatedAction: WorkflowAction) => {
    onChange(actions.map((a) => (a.id === updatedAction.id ? updatedAction : a)))
  }

  const handleDeleteAction = (actionId: string) => {
    onChange(actions.filter((a) => a.id !== actionId))
    if (expandedActionId === actionId) {
      setExpandedActionId(actions[0]?.id || null)
    }
  }

  const actionsByCategory = getActionsByCategory()

  return (
    <div className="space-y-3">
      {/* Action Cards */}
      {actions.length > 0 ? (
        <div className="space-y-2">
          {actions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              variables={variables}
              statuses={statuses}
              isExpanded={expandedActionId === action.id}
              onToggle={() =>
                setExpandedActionId(expandedActionId === action.id ? null : action.id)
              }
              onUpdate={handleUpdateAction}
              onDelete={() => handleDeleteAction(action.id)}
              onAddVariable={onAddVariable}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No actions yet. Add an action to get started.
        </div>
      )}

      {/* Add Action Button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="mr-2 size-4" />
            Add Action
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {Object.entries(actionsByCategory).map(([category, actionsInCategory]) => (
            <DropdownMenuGroup key={category}>
              <DropdownMenuLabel>
                {actionCategories[category as keyof typeof actionCategories].label}
              </DropdownMenuLabel>
              {actionsInCategory.map((action) => {
                const Icon = action.icon
                return (
                  <DropdownMenuItem
                    key={action.type}
                    onClick={() => handleAddAction(action.type)}
                  >
                    <Icon className="mr-2 size-4" />
                    <div>
                      <div className="font-medium">{action.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {action.description}
                      </div>
                    </div>
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuSeparator />
            </DropdownMenuGroup>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
