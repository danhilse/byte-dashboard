"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TriggerConfig } from "./step-types/trigger-config"
import { AssignTaskConfig } from "./step-types/assign-task-config"
import { WaitForTaskConfig } from "./step-types/wait-for-task-config"
import { WaitForApprovalConfig } from "./step-types/wait-for-approval-config"
import { UpdateStatusConfig } from "./step-types/update-status-config"
import { ConditionConfig } from "./step-types/condition-config"
import { SendEmailConfig } from "./step-types/send-email-config"
import { DelayConfig } from "./step-types/delay-config"
import { UpdateContactConfig } from "./step-types/update-contact-config"
import { UpdateTaskConfig } from "./step-types/update-task-config"
import type { WorkflowStep } from "@/types"

interface StepConfigPanelProps {
  step: WorkflowStep | null
  steps: WorkflowStep[]
  onStepUpdate: (step: WorkflowStep) => void
}

export function StepConfigPanel({
  step,
  steps,
  onStepUpdate,
}: StepConfigPanelProps) {
  if (!step) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>Select a step to configure it.</p>
      </div>
    )
  }

  const handleLabelChange = (label: string) => {
    onStepUpdate({ ...step, label })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="step-label">Step Label</Label>
        <Input
          id="step-label"
          value={step.label}
          onChange={(e) => handleLabelChange(e.target.value)}
        />
      </div>

      <hr />

      {step.type === "trigger" && (
        <TriggerConfig step={step} onUpdate={onStepUpdate} />
      )}
      {step.type === "assign_task" && (
        <AssignTaskConfig step={step} steps={steps} onUpdate={onStepUpdate} />
      )}
      {step.type === "wait_for_task" && (
        <WaitForTaskConfig step={step} onUpdate={onStepUpdate} />
      )}
      {step.type === "wait_for_approval" && (
        <WaitForApprovalConfig step={step} onUpdate={onStepUpdate} />
      )}
      {step.type === "update_status" && (
        <UpdateStatusConfig step={step} onUpdate={onStepUpdate} />
      )}
      {step.type === "condition" && (
        <ConditionConfig step={step} steps={steps} onUpdate={onStepUpdate} />
      )}
      {step.type === "send_email" && (
        <SendEmailConfig step={step} steps={steps} onUpdate={onStepUpdate} />
      )}
      {step.type === "delay" && (
        <DelayConfig step={step} onUpdate={onStepUpdate} />
      )}
      {step.type === "update_contact" && (
        <UpdateContactConfig step={step} steps={steps} onUpdate={onStepUpdate} />
      )}
      {step.type === "update_task" && (
        <UpdateTaskConfig step={step} steps={steps} onUpdate={onStepUpdate} />
      )}
    </div>
  )
}
