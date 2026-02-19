"use client"

import { useMemo, useState } from "react"

import type { WorkflowAction, WorkflowVariable } from "../../../types/workflow-v2"
import type { WorkflowEmailTemplate } from "@/types/settings"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface SendEmailConfigProps {
  action: Extract<WorkflowAction, { type: "send_email" }>
  variables: WorkflowVariable[]
  allowedFromEmails: string[]
  defaultFromEmail: string | null
  emailTemplates: WorkflowEmailTemplate[]
  onChange: (action: WorkflowAction) => void
}

const FROM_DEFAULT_VALUE = "__org_default__"
const TEMPLATE_NONE_VALUE = "__no_template__"

function getTemplateSelectionValue(
  subject: string,
  body: string,
  templates: WorkflowEmailTemplate[]
): string {
  const matched = templates.find(
    (template) => template.subject === subject && template.body === body
  )
  return matched?.id ?? TEMPLATE_NONE_VALUE
}

export function SendEmailConfig({
  action,
  variables,
  allowedFromEmails,
  defaultFromEmail,
  emailTemplates,
  onChange,
}: SendEmailConfigProps) {
  const { toast } = useToast()
  const [testRecipient, setTestRecipient] = useState("")
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)

  const handleChange = (
    field: keyof typeof action.config,
    value: string | number
  ) => {
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

  const selectedTemplateId = useMemo(
    () =>
      getTemplateSelectionValue(
        action.config.subject,
        action.config.body,
        emailTemplates
      ),
    [action.config.body, action.config.subject, emailTemplates]
  )
  const selectedTemplate =
    emailTemplates.find((template) => template.id === selectedTemplateId) ?? null
  const [previewTemplateId, setPreviewTemplateId] = useState<string>(TEMPLATE_NONE_VALUE)
  const previewTemplate =
    emailTemplates.find((template) => template.id === previewTemplateId) ?? null

  const failurePolicy = action.config.failurePolicy ?? "fail_workflow"
  const retryCount =
    typeof action.config.retryCount === "number" && Number.isFinite(action.config.retryCount)
      ? Math.max(1, Math.min(5, Math.floor(action.config.retryCount)))
      : 1

  const openTemplateDialog = () => {
    const initialTemplateId =
      selectedTemplateId !== TEMPLATE_NONE_VALUE
        ? selectedTemplateId
        : emailTemplates[0]?.id ?? TEMPLATE_NONE_VALUE
    setPreviewTemplateId(initialTemplateId)
    setTemplateDialogOpen(true)
  }

  const handleApplyTemplate = () => {
    if (!previewTemplate) {
      return
    }

    onChange({
      ...action,
      config: {
        ...action.config,
        subject: previewTemplate.subject,
        body: previewTemplate.body,
      },
    })
    setTemplateDialogOpen(false)
  }

  const handleSendTestEmail = async () => {
    if (!testRecipient.trim()) {
      toast({
        title: "Test recipient required",
        description: "Enter a recipient email address for the test send.",
        variant: "destructive",
      })
      return
    }

    setIsSendingTest(true)
    try {
      const response = await fetch("/api/workflow-email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testRecipient.trim(),
          subject: action.config.subject,
          body: action.config.body,
          from: action.config.from || undefined,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to send test email")
      }

      toast({
        title: "Test email sent",
        description: "Check your inbox and Resend logs for delivery details.",
      })
      setTestDialogOpen(false)
    } catch (error) {
      toast({
        title: "Unable to send test email",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSendingTest(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
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
              <SelectItem value={FROM_DEFAULT_VALUE}>
                {defaultFromEmail
                  ? `Use organization default (${defaultFromEmail})`
                  : "Use organization default"}
              </SelectItem>
              {allowedFromEmails.map((email) => (
                <SelectItem key={email} value={email}>
                  {email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!hasConfiguredFromEmails && (
            <p className="text-xs text-muted-foreground">
              No sender addresses configured in Settings. This action will use the
              environment default sender.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${action.id}-subject`}>Subject</Label>
          <div className="flex items-center gap-2">
            {selectedTemplate && (
              <span className="text-xs text-muted-foreground">
                {selectedTemplate.name}
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={openTemplateDialog}
              disabled={emailTemplates.length === 0}
            >
              Insert Template
            </Button>
          </div>
        </div>
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

      <div className="grid gap-3 md:grid-cols-[240px_1fr] md:items-end">
        <div className="space-y-2">
          <Label htmlFor={`${action.id}-failure-policy`}>Failure Policy</Label>
          <Select
            value={failurePolicy}
            onValueChange={(value) => handleChange("failurePolicy", value)}
          >
            <SelectTrigger id={`${action.id}-failure-policy`}>
              <SelectValue placeholder="Choose failure policy..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fail_workflow">Fail workflow</SelectItem>
              <SelectItem value="continue">Continue workflow</SelectItem>
              <SelectItem value="retry">Retry then fail</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:justify-self-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTestDialogOpen(true)}
          >
            Send Test Email
          </Button>
        </div>
      </div>

      {failurePolicy === "retry" && (
        <div className="space-y-2">
          <Label htmlFor={`${action.id}-retry-count`}>Retry Count</Label>
          <Input
            id={`${action.id}-retry-count`}
            type="number"
            min={1}
            max={5}
            value={retryCount}
            onChange={(event) => {
              const parsedValue = Number(event.target.value)
              if (!Number.isFinite(parsedValue)) {
                return
              }
              handleChange(
                "retryCount",
                Math.max(1, Math.min(5, Math.floor(parsedValue)))
              )
            }}
          />
          <p className="text-xs text-muted-foreground">
            Number of additional attempts after the first send failure (max 5).
          </p>
        </div>
      )}

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Email Templates</DialogTitle>
            <DialogDescription>
              Preview and apply a template to this action&apos;s subject and body.
            </DialogDescription>
          </DialogHeader>
          {emailTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No templates are available yet. Add them in organization settings.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {emailTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setPreviewTemplateId(template.id)}
                    className={cn(
                      "w-full rounded-md border p-3 text-left transition-colors",
                      previewTemplateId === template.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <p className="text-sm font-medium">{template.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {template.subject}
                    </p>
                  </button>
                ))}
              </div>
              <div className="space-y-3 rounded-md border p-4">
                {previewTemplate ? (
                  <>
                    <div>
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Subject
                      </p>
                      <p className="mt-1 text-sm font-medium break-words">
                        {previewTemplate.subject}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Body
                      </p>
                      <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-sm">
                        {previewTemplate.body}
                      </pre>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a template to see a preview.
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTemplateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApplyTemplate}
              disabled={!previewTemplate}
            >
              Apply Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send this email to a recipient using sample variable values.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`${action.id}-test-recipient`}>Recipient Email</Label>
            <Input
              id={`${action.id}-test-recipient`}
              type="email"
              value={testRecipient}
              onChange={(event) => setTestRecipient(event.target.value)}
              placeholder="recipient@example.com"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTestDialogOpen(false)}
              disabled={isSendingTest}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSendTestEmail()}
              disabled={isSendingTest}
            >
              {isSendingTest ? "Sending..." : "Send Test Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
