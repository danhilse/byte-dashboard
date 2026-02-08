"use client"

import { useState } from "react"
import type { WorkflowStepV2, WorkflowVariable } from "../types/workflow-v2"
import { ActionList } from "./actions/action-list"
import { AdvancementConfig } from "./advancement/advancement-config"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  onStepUpdate: (step: WorkflowStepV2) => void
}

export function StepConfigPanelV2({
  step,
  allSteps,
  variables,
  onStepUpdate,
}: StepConfigPanelV2Props) {
  const [showDescription, setShowDescription] = useState(false)

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
    onStepUpdate({ ...step, actions })
  }

  const handleAdvancementChange = (advancementCondition: typeof step.advancementCondition) => {
    onStepUpdate({ ...step, advancementCondition })
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-6">
        {/* Section 1: Step Name */}
        <div className="space-y-2">
          <Label htmlFor="step-name">Step Name</Label>
          <Input
            id="step-name"
            value={step.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g., Submit Application"
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

        {/* Section 2: Actions */}
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
            onChange={handleActionsChange}
          />
        </div>

        {/* Section 3: Advancement */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Advancement Condition</h3>
            <p className="text-xs text-muted-foreground">
              What moves the workflow to the next step
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
