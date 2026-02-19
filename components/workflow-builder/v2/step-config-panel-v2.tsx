"use client"

import { useState, useEffect, useRef } from "react"
import type { WorkflowStepV2, WorkflowVariable, BranchStepV2, AdvancementCondition, WorkflowStatus, VariableType } from "../types/workflow-v2"
import { isBranchStep } from "../types/workflow-v2"
import { ActionList } from "./actions/action-list"
import { AdvancementConfig } from "./advancement/advancement-config"
import { VariableSelector } from "./variable-selector"
import { parseVariableRef, formatVariableRef } from "@/lib/workflow-builder-v2/variable-utils"
import type { OrganizationUserOption } from "./organization-user-option"
import type { WorkflowEmailTemplate } from "@/types/settings"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronDown, ChevronRight } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface StepConfigPanelV2Props {
  step: WorkflowStepV2 | undefined
  allSteps: WorkflowStepV2[]
  variables: WorkflowVariable[]
  statuses: WorkflowStatus[]
  organizationUsers: OrganizationUserOption[]
  organizationUsersLoading: boolean
  allowedFromEmails: string[]
  defaultFromEmail: string | null
  emailTemplates: WorkflowEmailTemplate[]
  onStepUpdate: (step: WorkflowStepV2) => void
  onAddVariable?: (variable: WorkflowVariable) => void
}

export function StepConfigPanelV2({
  step,
  allSteps,
  variables,
  statuses,
  organizationUsers,
  organizationUsersLoading,
  allowedFromEmails,
  defaultFromEmail,
  emailTemplates,
  onStepUpdate,
  onAddVariable,
}: StepConfigPanelV2Props) {
  const [showDescription, setShowDescription] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const prevStepCountRef = useRef(allSteps.length)
  const autoFocusedStepsRef = useRef(new Set<string>())

  // Auto-focus and select the step name input ONLY for newly created steps
  useEffect(() => {
    if (!step) return

    const currentStepCount = allSteps.length
    const stepCountIncreased = currentStepCount > prevStepCountRef.current
    const isDefaultName = step.name === "New Step" || step.name === "New Branch"
    const notYetAutoFocused = !autoFocusedStepsRef.current.has(step.id)

    if (stepCountIncreased && isDefaultName && notYetAutoFocused && nameInputRef.current) {
      // Mark this step as auto-focused
      autoFocusedStepsRef.current.add(step.id)

      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus()
          nameInputRef.current.select()
        }
      }, 50)
    }

    // Update the ref for next comparison
    prevStepCountRef.current = currentStepCount
  }, [allSteps.length, step?.id])

  if (!step) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">No step selected</p>
          <p className="text-sm">Select a step from the list to configure it</p>
        </div>
      </div>
    )
  }

  const handleNameChange = (name: string) => {
    onStepUpdate({ ...step, name })
  }

  const handleDescriptionChange = (description: string) => {
    onStepUpdate({ ...step, description })
  }

  const handleActionsChange = (actions: typeof step.actions) => {
    onStepUpdate({ ...step, actions } as WorkflowStepV2)
  }

  const handleAdvancementChange = (advancementCondition: AdvancementCondition) => {
    onStepUpdate({ ...step, advancementCondition } as WorkflowStepV2)
  }

  // Branch-specific handlers
  const handleBranchConditionChange = (updates: Partial<BranchStepV2["condition"]>) => {
    if (!isBranchStep(step)) return

    // When variable changes, reset operator and compareValue to smart defaults
    if (updates.variableRef !== undefined) {
      const variable = variables.find((v) => {
        const ref = updates.variableRef || ""
        return ref.startsWith(v.id) || ref.includes(v.id)
      })

      let smartOperator: BranchStepV2["condition"]["operator"] = "equals"
      let smartValue: string | string[] = ""

      // Detect variable type and set smart defaults
      if (variable) {
        // Email type → default to contains
        if (variable.dataType === "email") {
          smartOperator = "contains"
        }
        // Boolean type → default to equals
        else if (variable.dataType === "boolean") {
          smartOperator = "equals"
          smartValue = "true"
        }
        // Check if it's an approval task outcome
        else if (variable.source.type === "action_output") {
          const actionId = variable.source.actionId
          const action = allSteps
            .flatMap((s) => (isBranchStep(s) ? [] : s.actions))
            .find((a) => a.id === actionId)
          if (action?.type === "create_task" && action.config.taskType === "approval") {
            smartValue = "approved"
          }
        }
      }

      onStepUpdate({
        ...step,
        condition: {
          variableRef: updates.variableRef,
          operator: smartOperator,
          compareValue: smartValue,
        },
      })
      return
    }

    // For other updates, just merge
    onStepUpdate({
      ...step,
      condition: {
        ...step.condition,
        ...updates,
      },
    })
  }

  // Helper: Get the selected variable's metadata
  const getSelectedVariable = () => {
    if (!isBranchStep(step)) return null
    const ref = step.condition.variableRef
    if (!ref) return null

    return variables.find((v) => {
      return ref.startsWith(v.id) || ref.includes(v.id)
    })
  }

  // Helper: Detect if variable is from an approval task
  const isApprovalTaskVariable = (variable: WorkflowVariable | null | undefined) => {
    if (!variable || variable.source.type !== "action_output") return false

    const actionId = variable.source.actionId
    const action = allSteps
      .flatMap((s) => (isBranchStep(s) ? [] : s.actions))
      .find((a) => a.id === actionId)

    return action?.type === "create_task" && action.config.taskType === "approval"
  }

  // Helper: Get available operators for the selected variable
  const getAvailableOperators = () => {
    const variable = getSelectedVariable()

    if (!variable) {
      // Default operators
      return [
        { value: "equals", label: "Equals (=)" },
        { value: "not_equals", label: "Not Equals (≠)" },
        { value: "contains", label: "Contains" },
        { value: "not_contains", label: "Does Not Contain" },
      ]
    }

    // Approval task outcome → only equals/not_equals
    if (isApprovalTaskVariable(variable)) {
      return [
        { value: "equals", label: "Is" },
        { value: "not_equals", label: "Is Not" },
      ]
    }

    // Email type → text matching operators
    if (variable.dataType === "email" || variable.dataType === "text") {
      return [
        { value: "equals", label: "Equals (=)" },
        { value: "not_equals", label: "Not Equals (≠)" },
        { value: "contains", label: "Contains" },
        { value: "not_contains", label: "Does Not Contain" },
      ]
    }

    // Boolean → only equals/not_equals
    if (variable.dataType === "boolean") {
      return [
        { value: "equals", label: "Is" },
        { value: "not_equals", label: "Is Not" },
      ]
    }

    // Status or multi-value fields → include in/not_in
    if (variable.name.toLowerCase().includes("status")) {
      return [
        { value: "equals", label: "Equals" },
        { value: "not_equals", label: "Not Equals" },
        { value: "in", label: "Is One Of" },
        { value: "not_in", label: "Is Not One Of" },
      ]
    }

    // Default
    return [
      { value: "equals", label: "Equals (=)" },
      { value: "not_equals", label: "Not Equals (≠)" },
      { value: "contains", label: "Contains" },
      { value: "not_contains", label: "Does Not Contain" },
    ]
  }

  const handleTrackLabelChange = (trackIndex: 0 | 1, label: string) => {
    if (!isBranchStep(step)) return
    const newTracks = [...step.tracks]
    newTracks[trackIndex] = { ...newTracks[trackIndex], label }
    onStepUpdate({
      ...step,
      tracks: newTracks as [typeof newTracks[0], typeof newTracks[1]],
    })
  }



  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-6">
        {/* Section 1: Step Name */}
        <div className="space-y-2">
          <Label htmlFor="step-name">Step Name</Label>
          <Input
            ref={nameInputRef}
            id="step-name"
            value={step.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={isBranchStep(step) ? "e.g., Review Decision" : "e.g., Submit Application"}
            className="text-base font-medium"
          />
        </div>

        {/* Collapsible Description */}
        <Collapsible open={showDescription} onOpenChange={setShowDescription}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
            >
              {showDescription ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
              Description (Optional)
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Textarea
              id="step-description"
              value={step.description || ""}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="What happens in this step?"
              rows={2}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Branch Configuration (only for branch steps) */}
        {isBranchStep(step) && (
          <>
            <Separator />
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Branch Condition</h3>
                <p className="text-xs text-muted-foreground">
                  The workflow will split into Track A or Track B based on this condition
                </p>
              </div>

              {/* Variable to Check — Two-step selector */}
              {(() => {
                const variableTypeLabels: Record<VariableType, string> = {
                  contact: "Contact Data",
                  task: "Task Output",
                  form_submission: "Form Data",
                  custom: "Custom Variable",
                  user: "User",
                }

                // Parse current ref into variable + field
                const parsed = step.condition.variableRef
                  ? parseVariableRef(step.condition.variableRef)
                  : { variableId: "", fieldKey: undefined }
                const selectedVar = variables.find((v) => v.id === parsed.variableId)

                // Group variables by type (only types that have variables)
                const typeOrder: VariableType[] = ["contact", "task", "form_submission", "custom", "user"]
                const groupedVars = typeOrder
                  .map((type) => ({
                    type,
                    label: variableTypeLabels[type],
                    vars: variables.filter((v) => v.type === type),
                  }))
                  .filter((g) => g.vars.length > 0)

                const handleVariableSourceChange = (variableId: string) => {
                  const variable = variables.find((v) => v.id === variableId)
                  if (!variable) return

                  // If variable has fields, auto-select first field
                  if (variable.fields && variable.fields.length > 0) {
                    const ref = formatVariableRef(variableId, variable.fields[0].key)
                    handleBranchConditionChange({ variableRef: ref })
                  } else {
                    handleBranchConditionChange({ variableRef: variableId })
                  }
                }

                const handleFieldChange = (fieldKey: string) => {
                  if (!parsed.variableId) return
                  const ref = formatVariableRef(parsed.variableId, fieldKey)
                  handleBranchConditionChange({ variableRef: ref })
                }

                return (
                  <>
                    {/* Step 1: Variable Source */}
                    <div className="space-y-2">
                      <Label>Variable Source</Label>
                      <Select
                        value={parsed.variableId}
                        onValueChange={handleVariableSourceChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a variable..." />
                        </SelectTrigger>
                        <SelectContent>
                          {groupedVars.map((group) => (
                            <SelectGroup key={group.type}>
                              <SelectLabel>{group.label}</SelectLabel>
                              {group.vars.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select the data source to check
                      </p>
                    </div>

                    {/* Step 2: Specific Field (only if variable has fields) */}
                    {selectedVar?.fields && selectedVar.fields.length > 0 && (
                      <div className="space-y-2">
                        <Label>Field</Label>
                        <Select
                          value={parsed.fieldKey || ""}
                          onValueChange={handleFieldChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select field..." />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedVar.fields.map((field) => (
                              <SelectItem key={field.key} value={field.key}>
                                <div className="flex items-center gap-2">
                                  {field.label}
                                  <span className="text-xs text-muted-foreground">
                                    ({field.dataType})
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Choose which field to evaluate
                        </p>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* Operator (context-aware) */}
              {step.condition.variableRef && (
                <div className="space-y-2">
                  <Label>Operator</Label>
                  <Select
                    value={step.condition.operator}
                    onValueChange={(value) =>
                      handleBranchConditionChange({
                        operator: value as BranchStepV2["condition"]["operator"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableOperators().map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Value Input (context-aware) */}
              {step.condition.variableRef && (() => {
                const variable = getSelectedVariable()
                const isApproval = isApprovalTaskVariable(variable)
                const isMulti = step.condition.operator === "in" || step.condition.operator === "not_in"

                // Approval task outcome → dropdown
                if (isApproval) {
                  return (
                    <div className="space-y-2">
                      <Label>Expected Outcome</Label>
                      <Select
                        value={typeof step.condition.compareValue === "string" ? step.condition.compareValue : ""}
                        onValueChange={(value) =>
                          handleBranchConditionChange({ compareValue: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Track A executes when condition is true, Track B when false
                      </p>
                    </div>
                  )
                }

                // Boolean type → true/false dropdown
                if (variable?.dataType === "boolean") {
                  return (
                    <div className="space-y-2">
                      <Label>Value</Label>
                      <Select
                        value={typeof step.condition.compareValue === "string" ? step.condition.compareValue : ""}
                        onValueChange={(value) =>
                          handleBranchConditionChange({ compareValue: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">True</SelectItem>
                          <SelectItem value="false">False</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )
                }

                // Multi-select for "in" operator (statuses, etc.)
                if (isMulti) {
                  return (
                    <div className="space-y-2">
                      <Label>Values (comma-separated)</Label>
                      <Input
                        value={Array.isArray(step.condition.compareValue)
                          ? step.condition.compareValue.join(", ")
                          : step.condition.compareValue}
                        onChange={(e) => {
                          const values = e.target.value.split(",").map(v => v.trim()).filter(Boolean)
                          handleBranchConditionChange({ compareValue: values })
                        }}
                        placeholder="e.g., pending, in_review, approved"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter multiple values separated by commas
                      </p>
                    </div>
                  )
                }

                // Default → variable selector with manual entry
                return (
                  <div className="space-y-2">
                    <Label>Compare To</Label>
                    <VariableSelector
                      value={typeof step.condition.compareValue === "string" ? step.condition.compareValue : ""}
                      onChange={(value) =>
                        handleBranchConditionChange({ compareValue: value })
                      }
                      variables={variables}
                      placeholder="Enter value or select variable..."
                      allowManualEntry={true}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a literal value or reference another variable
                    </p>
                  </div>
                )
              })()}

              <Separator />

              {/* Track Labels */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium">Track Labels</h4>
                  <p className="text-xs text-muted-foreground">
                    Customize the names for each execution path
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Track A Label</Label>
                    <Input
                      value={step.tracks[0].label}
                      onChange={(e) => handleTrackLabelChange(0, e.target.value)}
                      placeholder="e.g., Approved"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Track B Label</Label>
                    <Input
                      value={step.tracks[1].label}
                      onChange={(e) => handleTrackLabelChange(1, e.target.value)}
                      placeholder="e.g., Rejected"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Section 2: Actions (only for standard steps) */}
        {!isBranchStep(step) && (
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Actions</h3>
              <p className="text-xs text-muted-foreground">
                What happens when this step executes
              </p>
            </div>
            <ActionList
              actions={step.actions}
              variables={variables}
              statuses={statuses}
              organizationUsers={organizationUsers}
              organizationUsersLoading={organizationUsersLoading}
              allowedFromEmails={allowedFromEmails}
              defaultFromEmail={defaultFromEmail}
              emailTemplates={emailTemplates}
              onChange={handleActionsChange}
              onAddVariable={onAddVariable}
            />
          </div>
        )}

        {/* Section 3: Advancement */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Advancement Condition</h3>
            <p className="text-xs text-muted-foreground">
              {isBranchStep(step)
                ? "When to advance after the selected track completes"
                : "What moves the workflow to the next step"}
            </p>
          </div>
          <AdvancementConfig
            condition={step.advancementCondition}
            availableActions={step.actions}
            allSteps={allSteps}
            onChange={handleAdvancementChange}
          />
        </div>
      </div>
    </ScrollArea>
  )
}
