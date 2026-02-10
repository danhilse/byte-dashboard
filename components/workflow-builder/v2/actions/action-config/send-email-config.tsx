"use client"

import type { WorkflowAction, WorkflowVariable } from "../../../types/workflow-v2"
import { Label } from "@/components/ui/label"
import { VariableSelector } from "../../variable-selector"
import { TemplatedTextInput } from "../../templated-text-input"

interface SendEmailConfigProps {
  action: Extract<WorkflowAction, { type: "send_email" }>
  variables: WorkflowVariable[]
  onChange: (action: WorkflowAction) => void
}

export function SendEmailConfig({ action, variables, onChange }: SendEmailConfigProps) {
  const handleChange = (field: keyof typeof action.config, value: string) => {
    onChange({
      ...action,
      config: {
        ...action.config,
        [field]: value,
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${action.id}-to`}>To</Label>
        <VariableSelector
          value={action.config.to}
          onChange={(value) => handleChange("to", value)}
          variables={variables}
          filterByDataType="email"
          allowManualEntry={true}
          placeholder="Select email or enter manually..."
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Select an email variable or enter an address manually
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${action.id}-subject`}>Subject</Label>
        <TemplatedTextInput
          id={`${action.id}-subject`}
          value={action.config.subject}
          onChange={(value) => handleChange("subject", value)}
          variables={variables}
          placeholder="Enter email subject..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${action.id}-body`}>Body</Label>
        <TemplatedTextInput
          id={`${action.id}-body`}
          value={action.config.body}
          onChange={(value) => handleChange("body", value)}
          variables={variables}
          placeholder="Email body..."
          multiline
          rows={6}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${action.id}-from`}>From (Optional)</Label>
        <VariableSelector
          value={action.config.from || ""}
          onChange={(value) => handleChange("from", value)}
          variables={variables}
          filterByDataType="email"
          allowManualEntry={true}
          placeholder="Select email or enter manually..."
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Defaults to system email if left empty
        </p>
      </div>
    </div>
  )
}
