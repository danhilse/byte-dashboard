"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { VariablePicker } from "../variable-picker"
import type { SendEmailStep, WorkflowStep } from "@/types"

interface SendEmailConfigProps {
  step: SendEmailStep
  steps: WorkflowStep[]
  onUpdate: (step: SendEmailStep) => void
}

export function SendEmailConfig({ step, steps, onUpdate }: SendEmailConfigProps) {
  const updateConfig = (partial: Partial<SendEmailStep["config"]>) => {
    onUpdate({
      ...step,
      config: { ...step.config, ...partial },
    })
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="email-to">To</Label>
          <VariablePicker
            steps={steps}
            currentStepId={step.id}
            onInsert={(v) => updateConfig({ to: step.config.to + v })}
          />
        </div>
        <Input
          id="email-to"
          placeholder="{{contact.email}}"
          value={step.config.to}
          onChange={(e) => updateConfig({ to: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Supports variable templates like <code className="text-xs">{"{{contact.email}}"}</code>
        </p>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="email-subject">Subject</Label>
          <VariablePicker
            steps={steps}
            currentStepId={step.id}
            onInsert={(v) => updateConfig({ subject: step.config.subject + v })}
          />
        </div>
        <Input
          id="email-subject"
          placeholder="e.g. Your application has been received"
          value={step.config.subject}
          onChange={(e) => updateConfig({ subject: e.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="email-body">Body</Label>
          <VariablePicker
            steps={steps}
            currentStepId={step.id}
            onInsert={(v) => updateConfig({ body: step.config.body + v })}
          />
        </div>
        <Textarea
          id="email-body"
          placeholder="Email body (supports HTML and variable templates)"
          value={step.config.body}
          onChange={(e) => updateConfig({ body: e.target.value })}
          rows={6}
        />
      </div>
    </div>
  )
}
