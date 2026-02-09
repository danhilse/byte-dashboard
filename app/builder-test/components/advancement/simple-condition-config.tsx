"use client"

import type {
  SimpleCondition,
  SimpleConditionType,
  WorkflowAction,
  WorkflowStepV2,
} from "../../types/workflow-v2"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, Plus, Trash2 } from "lucide-react"
import { conditionRegistry } from "@/lib/workflow-builder-v2/condition-registry"

interface SimpleConditionConfigProps {
  condition: SimpleCondition
  availableActions: WorkflowAction[]
  allSteps: WorkflowStepV2[]
  onChange: (condition: SimpleCondition) => void
  compact?: boolean // For use in compound condition builder
}

export function SimpleConditionConfig({
  condition,
  availableActions,
  allSteps,
  onChange,
  compact = false,
}: SimpleConditionConfigProps) {
  const handleTypeChange = (type: SimpleConditionType) => {
    const metadata = conditionRegistry[type]
    onChange(metadata.defaultConfig as SimpleCondition)
  }

  const taskActions = availableActions.filter((a) => a.type === "create_task")
  const approvalTasks = taskActions.filter((a) => a.config.taskType === "approval")

  return (
    <div className="space-y-4">
      {/* Type Selector (only if not compact) */}
      {!compact && (
        <div className="space-y-2">
          <Label htmlFor="condition-type">Condition Type</Label>
          <Select value={condition.type} onValueChange={handleTypeChange}>
            <SelectTrigger id="condition-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(conditionRegistry).map((meta) => {
                const Icon = meta.icon
                const isDisabled = meta.type === "when_form_submitted" || meta.type === "conditional_branches"
                return (
                  <SelectItem key={meta.type} value={meta.type} disabled={isDisabled}>
                    <div className="flex items-center gap-2">
                      <Icon className="size-4" />
                      {meta.label}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {conditionRegistry[condition.type].description}
          </p>
        </div>
      )}

      {/* Type-Specific Config */}
      {condition.type === "automatic" && <AutomaticConfig />}

      {condition.type === "when_task_completed" && (
        <WhenTaskCompletedConfig
          condition={condition}
          taskActions={taskActions}
          onChange={onChange}
        />
      )}

      {condition.type === "when_multiple_tasks_completed" && (
        <WhenMultipleTasksCompletedConfig
          condition={condition}
          taskActions={taskActions}
          onChange={onChange}
        />
      )}

      {condition.type === "when_approved" && (
        <WhenApprovedConfig
          condition={condition}
          approvalTasks={approvalTasks}
          allSteps={allSteps}
          onChange={onChange}
        />
      )}

      {condition.type === "when_form_submitted" && (
        <WhenFormSubmittedConfig condition={condition} onChange={onChange} />
      )}

      {condition.type === "when_duration_passes" && (
        <WhenDurationPassesConfig condition={condition} onChange={onChange} />
      )}

      {condition.type === "when_manually_advanced" && (
        <WhenManuallyAdvancedConfig condition={condition} onChange={onChange} />
      )}

      {condition.type === "conditional_branches" && (
        <ConditionalBranchesConfig
          condition={condition}
          allSteps={allSteps}
          onChange={onChange}
        />
      )}
    </div>
  )
}

// Individual condition config components

function AutomaticConfig() {
  return (
    <div className="text-sm text-muted-foreground">
      <p>Step will advance automatically after all actions complete.</p>
    </div>
  )
}

function WhenTaskCompletedConfig({
  condition,
  taskActions,
  onChange,
}: {
  condition: Extract<SimpleCondition, { type: "when_task_completed" }>
  taskActions: WorkflowAction[]
  onChange: (c: SimpleCondition) => void
}) {
  if (taskActions.length === 0) {
    return (
      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>No task actions in this step. Add a task first.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-2">
      <Label>Task</Label>
      <Select
        value={condition.config.taskActionId}
        onValueChange={(value) =>
          onChange({
            ...condition,
            config: { taskActionId: value },
          })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Select task..." />
        </SelectTrigger>
        <SelectContent>
          {taskActions.map((action) => {
            const taskAction = action as Extract<WorkflowAction, { type: "create_task" }>
            return (
              <SelectItem key={action.id} value={action.id}>
                {taskAction.config.title || `Task ${action.id}`}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}

function WhenMultipleTasksCompletedConfig({
  condition,
  taskActions,
  onChange,
}: {
  condition: Extract<SimpleCondition, { type: "when_multiple_tasks_completed" }>
  taskActions: WorkflowAction[]
  onChange: (c: SimpleCondition) => void
}) {
  if (taskActions.length === 0) {
    return (
      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>No task actions in this step. Add a task first.</AlertDescription>
      </Alert>
    )
  }

  const selectedTaskIds = condition.config.taskActionIds
  const operator = condition.config.operator

  const handleToggleTask = (taskId: string) => {
    const newIds = selectedTaskIds.includes(taskId)
      ? selectedTaskIds.filter((id) => id !== taskId)
      : [...selectedTaskIds, taskId]

    onChange({
      ...condition,
      config: {
        taskActionIds: newIds,
        operator,
      },
    })
  }

  const handleOperatorChange = (newOperator: "ANY" | "ALL") => {
    onChange({
      ...condition,
      config: {
        taskActionIds: selectedTaskIds,
        operator: newOperator,
      },
    })
  }

  return (
    <div className="space-y-4">
      {/* ANY/ALL Selector */}
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
        <span className="text-sm">Advance when</span>
        <Select value={operator} onValueChange={handleOperatorChange}>
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ANY">ANY</SelectItem>
            <SelectItem value="ALL">ALL</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">of these tasks complete</span>
      </div>

      {/* Task Selection */}
      <div className="space-y-2">
        <Label>Tasks (select multiple)</Label>
        <div className="space-y-1">
          {taskActions.map((action) => {
            const taskAction = action as Extract<WorkflowAction, { type: "create_task" }>
            const isSelected = selectedTaskIds.includes(action.id)
            return (
              <label
                key={action.id}
                className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleTask(action.id)}
                  className="cursor-pointer"
                />
                <span className="text-sm">{taskAction.config.title || `Task ${action.id}`}</span>
              </label>
            )
          })}
        </div>
        {selectedTaskIds.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Select at least one task to wait for
          </p>
        )}
      </div>
    </div>
  )
}


function WhenApprovedConfig({
  condition,
  approvalTasks,
  allSteps,
  onChange,
}: {
  condition: Extract<SimpleCondition, { type: "when_approved" }>
  approvalTasks: WorkflowAction[]
  allSteps: WorkflowStepV2[]
  onChange: (c: SimpleCondition) => void
}) {
  if (approvalTasks.length === 0) {
    return (
      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>No approval tasks in this step.</AlertDescription>
      </Alert>
    )
  }

  const onApprovedValue =
    condition.config.onApproved === "next" ? "next" : condition.config.onApproved.gotoStepId

  const onRejectedValue =
    condition.config.onRejected === "next"
      ? "next"
      : condition.config.onRejected === "end"
        ? "end"
        : condition.config.onRejected.gotoStepId

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Approval Task</Label>
        <Select
          value={condition.config.taskActionId}
          onValueChange={(value) =>
            onChange({
              ...condition,
              config: { ...condition.config, taskActionId: value },
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {approvalTasks.map((action) => {
              const taskAction = action as Extract<WorkflowAction, { type: "create_task" }>
              return (
                <SelectItem key={action.id} value={action.id}>
                  {taskAction.config.title || `Task ${action.id}`}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>When Approved</Label>
        <Select
          value={onApprovedValue}
          onValueChange={(value) =>
            onChange({
              ...condition,
              config: {
                ...condition.config,
                onApproved: value === "next" ? "next" : { gotoStepId: value },
              },
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="next">Go to next step</SelectItem>
            {allSteps.map((step) => (
              <SelectItem key={step.id} value={step.id}>
                Go to: {step.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>When Rejected</Label>
        <Select
          value={onRejectedValue}
          onValueChange={(value) =>
            onChange({
              ...condition,
              config: {
                ...condition.config,
                onRejected:
                  value === "next" ? "next" : value === "end" ? "end" : { gotoStepId: value },
              },
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="next">Go to next step</SelectItem>
            <SelectItem value="end">End workflow</SelectItem>
            {allSteps.map((step) => (
              <SelectItem key={step.id} value={step.id}>
                Go to: {step.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function WhenFormSubmittedConfig({
  condition,
  onChange,
}: {
  condition: Extract<SimpleCondition, { type: "when_form_submitted" }>
  onChange: (c: SimpleCondition) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Form ID</Label>
        <Input
          value={condition.config.formId}
          onChange={(e) =>
            onChange({
              ...condition,
              config: { ...condition.config, formId: e.target.value },
            })
          }
          placeholder="Enter external form ID"
        />
      </div>
    </div>
  )
}

function WhenDurationPassesConfig({
  condition,
  onChange,
}: {
  condition: Extract<SimpleCondition, { type: "when_duration_passes" }>
  onChange: (c: SimpleCondition) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Duration</Label>
        <Input
          type="number"
          value={condition.config.duration}
          onChange={(e) =>
            onChange({
              ...condition,
              config: { ...condition.config, duration: Number(e.target.value) },
            })
          }
          min="1"
        />
      </div>
      <div className="space-y-2">
        <Label>Unit</Label>
        <Select
          value={condition.config.unit}
          onValueChange={(value: "hours" | "days" | "weeks") =>
            onChange({
              ...condition,
              config: { ...condition.config, unit: value },
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hours">Hours</SelectItem>
            <SelectItem value="days">Days</SelectItem>
            <SelectItem value="weeks">Weeks</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function WhenManuallyAdvancedConfig({
  condition,
  onChange,
}: {
  condition: Extract<SimpleCondition, { type: "when_manually_advanced" }>
  onChange: (c: SimpleCondition) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Button Label (Optional)</Label>
        <Input
          value={condition.config.buttonLabel || ""}
          onChange={(e) =>
            onChange({
              ...condition,
              config: { ...condition.config, buttonLabel: e.target.value || undefined },
            })
          }
          placeholder="e.g., Continue, Proceed, Next"
        />
        <p className="text-xs text-muted-foreground">
          Custom label for the manual advance button
        </p>
      </div>
    </div>
  )
}

function ConditionalBranchesConfig({
  condition,
  allSteps,
  onChange,
}: {
  condition: Extract<SimpleCondition, { type: "conditional_branches" }>
  allSteps: WorkflowStepV2[]
  onChange: (c: SimpleCondition) => void
}) {
  const handleAddBranch = () => {
    onChange({
      ...condition,
      config: {
        ...condition.config,
        branches: [
          ...condition.config.branches,
          { condition: "equals", value: "", gotoStepId: "" },
        ],
      },
    })
  }

  const handleRemoveBranch = (index: number) => {
    onChange({
      ...condition,
      config: {
        ...condition.config,
        branches: condition.config.branches.filter((_, i) => i !== index),
      },
    })
  }

  const handleBranchChange = (
    index: number,
    field: "condition" | "value" | "gotoStepId",
    value: string
  ) => {
    const newBranches = [...condition.config.branches]
    newBranches[index] = { ...newBranches[index], [field]: value }
    onChange({
      ...condition,
      config: {
        ...condition.config,
        branches: newBranches,
      },
    })
  }

  const defaultValue =
    condition.config.default === "next"
      ? "next"
      : condition.config.default === "end"
        ? "end"
        : condition.config.default.gotoStepId

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Variable to Check</Label>
        <Input
          value={condition.config.field}
          onChange={(e) =>
            onChange({
              ...condition,
              config: { ...condition.config, field: e.target.value },
            })
          }
          placeholder="e.g., {{action_1.outcome}}"
        />
      </div>

      <div>
        <Label>Branches</Label>
        {condition.config.branches.length > 0 ? (
          <div className="mt-2 space-y-2">
            {condition.config.branches.map((branch, index) => (
              <div key={index} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Branch {index + 1}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0"
                    onClick={() => handleRemoveBranch(index)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Condition</Label>
                    <Select
                      value={branch.condition}
                      onValueChange={(value) => handleBranchChange(index, "condition", value)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="not_equals">Not Equals</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Value</Label>
                    <Input
                      value={branch.value}
                      onChange={(e) => handleBranchChange(index, "value", e.target.value)}
                      placeholder="Value"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Then go to</Label>
                  <Select
                    value={branch.gotoStepId}
                    onValueChange={(value) => handleBranchChange(index, "gotoStepId", value)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select step..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allSteps.map((step) => (
                        <SelectItem key={step.id} value={step.id}>
                          {step.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            No branches configured
          </div>
        )}
      </div>

      <Button variant="outline" size="sm" onClick={handleAddBranch} className="w-full">
        <Plus className="mr-2 size-4" />
        Add Branch
      </Button>

      <div className="space-y-2">
        <Label>Default (if no match)</Label>
        <Select
          value={defaultValue}
          onValueChange={(value) =>
            onChange({
              ...condition,
              config: {
                ...condition.config,
                default:
                  value === "next" ? "next" : value === "end" ? "end" : { gotoStepId: value },
              },
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="next">Go to next step</SelectItem>
            <SelectItem value="end">End workflow</SelectItem>
            {allSteps.map((step) => (
              <SelectItem key={step.id} value={step.id}>
                Go to: {step.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
