"use client"

import type { WorkflowAction, WorkflowVariable } from "../../../types/workflow-v2"
import { Label } from "@/components/ui/label"
import { VariableSelector } from "../../variable-selector"
import { TemplatedTextInput } from "../../templated-text-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SendEmailConfigProps {
  action: Extract<WorkflowAction, { type: "send_email" }>
  variables: WorkflowVariable[]
  allowedFromEmails: string[]
  onChange: (action: WorkflowAction) => void
}

const FROM_DEFAULT_VALUE = "__org_default__"

export function SendEmailConfig({
  action,
  variables,
  allowedFromEmails,
  onChange,
}: SendEmailConfigProps) {
  const handleChange = (field: keyof typeof action.config, value: string) => {
    onChange({
      ...action,
      config: {
        ...action.config,
        [field]: value,
      },
    })
  }

  const hasConfiguredFromEmails = allowedFromEmails.length > 0
  const selectedFromValue =
    action.config.from && allowedFromEmails.includes(action.config.from)
      ? action.config.from
      : FROM_DEFAULT_VALUE

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
        <Select
          value={selectedFromValue}
          onValueChange={(value) =>
            handleChange("from", value === FROM_DEFAULT_VALUE ? "" : value)
          }
        >
          <SelectTrigger id={`${action.id}-from`}>
            <SelectValue placeholder="Select sender address..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FROM_DEFAULT_VALUE}>Use organization default</SelectItem>
            {allowedFromEmails.map((email) => (
              <SelectItem key={email} value={email}>
                {email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Sender addresses are restricted to your organization allowlist.
        </p>
        {!hasConfiguredFromEmails && (
          <p className="text-xs text-amber-700">
            No sender addresses configured in Settings. This action will use the
            environment default sender.
          </p>
        )}
      </div>
    </div>
  )
}
