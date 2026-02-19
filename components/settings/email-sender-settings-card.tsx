"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function EmailSenderSettingsCard() {
  const { toast } = useToast()
  const [allowedFromEmails, setAllowedFromEmails] = useState<string[]>([])
  const [candidateEmail, setCandidateEmail] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings/email-senders")
        const payload = await response.json().catch(() => null)

        if (!response.ok || !Array.isArray(payload?.allowedFromEmails)) {
          throw new Error(payload?.error || "Failed to load sender addresses")
        }

        if (!cancelled) {
          setAllowedFromEmails(
            payload.allowedFromEmails.filter(
              (email: unknown): email is string =>
                typeof email === "string" && email.length > 0
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
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/settings/email-senders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedFromEmails }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !Array.isArray(payload?.allowedFromEmails)) {
        throw new Error(payload?.error || "Failed to update sender addresses")
      }

      setAllowedFromEmails(
        payload.allowedFromEmails.filter(
          (email: unknown): email is string =>
            typeof email === "string" && email.length > 0
        )
      )
      toast({
        title: "Sender addresses updated",
        description: "Workflow emails can now use the updated allowlist.",
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
