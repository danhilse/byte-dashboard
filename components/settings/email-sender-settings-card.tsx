"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { WorkflowEmailTemplate } from "@/types/settings"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEFAULT_FROM_NONE = "__no_default__"
const EMPTY_TEMPLATE: Omit<WorkflowEmailTemplate, "id"> = {
  name: "",
  subject: "",
  body: "",
}

function createTemplateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `template_${Date.now()}`
}

export function EmailSenderSettingsCard() {
  const { toast } = useToast()
  const [allowedFromEmails, setAllowedFromEmails] = useState<string[]>([])
  const [defaultFromEmail, setDefaultFromEmail] = useState<string | null>(null)
  const [templates, setTemplates] = useState<WorkflowEmailTemplate[]>([])
  const [candidateEmail, setCandidateEmail] = useState("")
  const [templateDraft, setTemplateDraft] = useState<Omit<WorkflowEmailTemplate, "id">>(
    EMPTY_TEMPLATE
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings/email-senders")
        const payload = await response.json().catch(() => null)

        if (
          !response.ok ||
          !Array.isArray(payload?.allowedFromEmails) ||
          !Array.isArray(payload?.templates)
        ) {
          throw new Error(payload?.error || "Failed to load sender addresses")
        }

        if (!cancelled) {
          setAllowedFromEmails(
            payload.allowedFromEmails.filter(
              (email: unknown): email is string =>
                typeof email === "string" && email.length > 0
            )
          )
          setDefaultFromEmail(
            typeof payload.defaultFromEmail === "string" && payload.defaultFromEmail.length > 0
              ? payload.defaultFromEmail
              : null
          )
          setTemplates(
            payload.templates.filter(
              (template: unknown): template is WorkflowEmailTemplate =>
                Boolean(template) &&
                typeof template === "object" &&
                !Array.isArray(template) &&
                typeof (template as WorkflowEmailTemplate).id === "string" &&
                typeof (template as WorkflowEmailTemplate).name === "string" &&
                typeof (template as WorkflowEmailTemplate).subject === "string" &&
                typeof (template as WorkflowEmailTemplate).body === "string"
            )
          )
        }
      } catch (error) {
        console.error("Error loading sender email settings:", error)
        if (!cancelled) {
          toast({
            title: "Unable to load sender addresses",
            description:
              error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadSettings()

    return () => {
      cancelled = true
    }
  }, [toast])

  const normalizedCandidate = candidateEmail.trim().toLowerCase()
  const candidateError = useMemo(() => {
    if (!normalizedCandidate) return null
    if (!EMAIL_PATTERN.test(normalizedCandidate)) {
      return "Enter a valid email address."
    }
    if (allowedFromEmails.includes(normalizedCandidate)) {
      return "Sender already exists."
    }
    return null
  }, [allowedFromEmails, normalizedCandidate])

  const handleAddSender = () => {
    if (!normalizedCandidate || candidateError) {
      return
    }

    setAllowedFromEmails((current) => [...current, normalizedCandidate])
    setCandidateEmail("")
  }

  const handleRemoveSender = (email: string) => {
    setAllowedFromEmails((current) => current.filter((value) => value !== email))
    setDefaultFromEmail((current) => (current === email ? null : current))
  }

  const templateDraftError = useMemo(() => {
    const hasInput =
      templateDraft.name.trim() ||
      templateDraft.subject.trim() ||
      templateDraft.body.trim()
    if (!hasInput) {
      return null
    }

    if (!templateDraft.name.trim()) {
      return "Template name is required."
    }
    if (!templateDraft.subject.trim()) {
      return "Template subject is required."
    }
    if (!templateDraft.body.trim()) {
      return "Template body is required."
    }
    return null
  }, [templateDraft.body, templateDraft.name, templateDraft.subject])

  const canAddTemplate =
    templateDraft.name.trim().length > 0 &&
    templateDraft.subject.trim().length > 0 &&
    templateDraft.body.trim().length > 0 &&
    !templateDraftError

  const settingsError = useMemo(() => {
    if (allowedFromEmails.length > 0 && !defaultFromEmail) {
      return "Select a default sender when allowed sender addresses are configured."
    }
    if (defaultFromEmail && !allowedFromEmails.includes(defaultFromEmail)) {
      return "Default sender must be one of the allowed sender addresses."
    }
    return null
  }, [allowedFromEmails, defaultFromEmail])

  const handleTemplateDraftChange = (
    field: keyof Omit<WorkflowEmailTemplate, "id">,
    value: string
  ) => {
    setTemplateDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleAddTemplate = () => {
    if (!canAddTemplate) {
      return
    }

    const nextTemplate: WorkflowEmailTemplate = {
      id: createTemplateId(),
      name: templateDraft.name.trim(),
      subject: templateDraft.subject.trim(),
      body: templateDraft.body.trim(),
    }

    setTemplates((current) => [...current, nextTemplate])
    setTemplateDraft(EMPTY_TEMPLATE)
  }

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates((current) => current.filter((template) => template.id !== templateId))
  }

  const handleSave = async () => {
    if (settingsError) {
      toast({
        title: "Settings incomplete",
        description: settingsError,
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/settings/email-senders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedFromEmails, defaultFromEmail, templates }),
      })

      const payload = await response.json().catch(() => null)

      if (
        !response.ok ||
        !Array.isArray(payload?.allowedFromEmails) ||
        !Array.isArray(payload?.templates)
      ) {
        throw new Error(payload?.error || "Failed to update sender addresses")
      }

      setAllowedFromEmails(
        payload.allowedFromEmails.filter(
          (email: unknown): email is string =>
            typeof email === "string" && email.length > 0
        )
      )
      setDefaultFromEmail(
        typeof payload.defaultFromEmail === "string" && payload.defaultFromEmail.length > 0
          ? payload.defaultFromEmail
          : null
      )
      setTemplates(
        payload.templates.filter(
          (template: unknown): template is WorkflowEmailTemplate =>
            Boolean(template) &&
            typeof template === "object" &&
            !Array.isArray(template) &&
            typeof (template as WorkflowEmailTemplate).id === "string" &&
            typeof (template as WorkflowEmailTemplate).name === "string" &&
            typeof (template as WorkflowEmailTemplate).subject === "string" &&
            typeof (template as WorkflowEmailTemplate).body === "string"
        )
      )
      toast({
        title: "Workflow email settings updated",
        description: "Sender allowlist, default sender, and templates were saved.",
      })
    } catch (error) {
      console.error("Error saving sender email settings:", error)
      toast({
        title: "Unable to save sender addresses",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Email Senders</CardTitle>
        <CardDescription>
          Restrict workflow <code>From</code> addresses to this organization allowlist.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workflow-sender-address">Allowed sender email</Label>
          <div className="flex items-center gap-2">
            <Input
              id="workflow-sender-address"
              type="email"
              value={candidateEmail}
              onChange={(event) => setCandidateEmail(event.target.value)}
              placeholder="noreply@yourdomain.com"
              disabled={isLoading || isSaving}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  handleAddSender()
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddSender}
              disabled={
                isLoading ||
                isSaving ||
                !normalizedCandidate ||
                Boolean(candidateError)
              }
            >
              <Plus className="mr-2 size-4" />
              Add
            </Button>
          </div>
          {candidateError && (
            <p className="text-xs text-destructive">{candidateError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Configured sender addresses</Label>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading sender addresses...
            </div>
          ) : allowedFromEmails.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sender addresses configured yet.
            </p>
          ) : (
            <div className="space-y-2">
              {allowedFromEmails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm">{email}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveSender(email)}
                    disabled={isSaving}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="default-sender-address">Default sender address</Label>
          <Select
            value={defaultFromEmail ?? DEFAULT_FROM_NONE}
            onValueChange={(value) =>
              setDefaultFromEmail(value === DEFAULT_FROM_NONE ? null : value)
            }
          >
            <SelectTrigger id="default-sender-address" disabled={isLoading || isSaving}>
              <SelectValue placeholder="Choose default sender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_FROM_NONE}>No default sender</SelectItem>
              {allowedFromEmails.map((email) => (
                <SelectItem key={email} value={email}>
                  {email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {settingsError && (
            <p className="text-xs text-destructive">{settingsError}</p>
          )}
        </div>

        <div className="space-y-3 rounded-md border p-3">
          <div>
            <Label>Email Templates</Label>
            <p className="text-xs text-muted-foreground">
              Reusable subject/body presets for workflow email actions.
            </p>
          </div>
          <div className="space-y-2">
            <Input
              value={templateDraft.name}
              onChange={(event) => handleTemplateDraftChange("name", event.target.value)}
              placeholder="Template name"
              disabled={isLoading || isSaving}
            />
            <Input
              value={templateDraft.subject}
              onChange={(event) => handleTemplateDraftChange("subject", event.target.value)}
              placeholder="Template subject"
              disabled={isLoading || isSaving}
            />
            <Textarea
              value={templateDraft.body}
              onChange={(event) => handleTemplateDraftChange("body", event.target.value)}
              placeholder="Template body"
              rows={4}
              disabled={isLoading || isSaving}
            />
            {templateDraftError && (
              <p className="text-xs text-muted-foreground">{templateDraftError}</p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleAddTemplate}
              disabled={isLoading || isSaving || !canAddTemplate}
            >
              <Plus className="mr-2 size-4" />
              Add Template
            </Button>
          </div>
          {templates.length > 0 && (
            <div className="space-y-2">
              {templates.map((template) => (
                <div key={template.id} className="rounded-md border p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{template.name}</p>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteTemplate(template.id)}
                      disabled={isSaving}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Subject: {template.subject}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    Body: {template.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Sender Settings"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
