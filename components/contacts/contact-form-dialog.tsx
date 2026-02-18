"use client"

import { useState } from "react"
import { Plus, Pencil } from "lucide-react"

import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { contactStatusConfig } from "@/lib/status-config"
import { validateContactPayload, type ValidationError } from "@/lib/validation/rules"
import type { Contact, ContactStatus } from "@/types"

interface ContactFormDialogProps {
  mode: "create" | "edit"
  contact?: Contact
  onSubmit: (contact: Omit<Contact, "id" | "createdAt"> | Contact) => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ContactFormDialog({
  mode,
  contact,
  onSubmit,
  trigger,
  open,
  onOpenChange,
}: ContactFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [firstName, setFirstName] = useState(
    mode === "edit" && contact ? contact.firstName : ""
  )
  const [lastName, setLastName] = useState(
    mode === "edit" && contact ? contact.lastName : ""
  )
  const [email, setEmail] = useState(
    mode === "edit" && contact ? contact.email : ""
  )
  const [phone, setPhone] = useState(
    mode === "edit" && contact ? contact.phone : ""
  )
  const [company, setCompany] = useState(
    mode === "edit" && contact ? contact.company : ""
  )
  const [role, setRole] = useState(
    mode === "edit" && contact ? contact.role : ""
  )
  const [status, setStatus] = useState<ContactStatus>(
    mode === "edit" && contact ? contact.status : "lead"
  )
  const [tags, setTags] = useState(
    mode === "edit" && contact ? (contact.tags?.join(", ") ?? "") : ""
  )
  const [addressLine1, setAddressLine1] = useState(
    mode === "edit" && contact ? (contact.addressLine1 ?? "") : ""
  )
  const [addressLine2, setAddressLine2] = useState(
    mode === "edit" && contact ? (contact.addressLine2 ?? "") : ""
  )
  const [city, setCity] = useState(
    mode === "edit" && contact ? (contact.city ?? "") : ""
  )
  const [state, setState] = useState(
    mode === "edit" && contact ? (contact.state ?? "") : ""
  )
  const [zip, setZip] = useState(
    mode === "edit" && contact ? (contact.zip ?? "") : ""
  )
  const [errors, setErrors] = useState<ValidationError[]>([])

  const fieldError = (field: string) =>
    errors.find((e) => e.field === field)?.message

  const resetForm = () => {
    setFirstName("")
    setLastName("")
    setEmail("")
    setPhone("")
    setCompany("")
    setRole("")
    setStatus("lead")
    setTags("")
    setAddressLine1("")
    setAddressLine2("")
    setCity("")
    setState("")
    setZip("")
    setErrors([])
  }

  const hydrateFromContact = (source: Contact) => {
    setFirstName(source.firstName)
    setLastName(source.lastName)
    setEmail(source.email)
    setPhone(source.phone)
    setCompany(source.company)
    setRole(source.role)
    setStatus(source.status)
    setTags(source.tags?.join(", ") ?? "")
    setAddressLine1(source.addressLine1 ?? "")
    setAddressLine2(source.addressLine2 ?? "")
    setCity(source.city ?? "")
    setState(source.state ?? "")
    setZip(source.zip ?? "")
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      if (mode === "edit" && contact) {
        hydrateFromContact(contact)
      } else if (mode === "create") {
        resetForm()
      }
    } else if (mode === "create") {
      resetForm()
    }

    if (open === undefined) {
      setInternalOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)
  }

  const handleSubmit = () => {
    const contactData = {
      firstName,
      lastName,
      email,
      phone,
      company,
      role,
      status,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      addressLine1: addressLine1 || undefined,
      addressLine2: addressLine2 || undefined,
      city: city || undefined,
      state: state || undefined,
      zip: zip || undefined,
      lastContactedAt: new Date().toISOString(),
    }

    const validationErrors = validateContactPayload(
      contactData as Record<string, unknown>,
      mode === "edit" ? "update" : "create"
    )
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors([])

    if (mode === "edit" && contact) {
      onSubmit({
        ...contact,
        ...contactData,
      })
    } else {
      onSubmit(contactData)
    }

    // Close dialog and reset form after submission
    if (mode === "create") {
      handleDialogOpenChange(false)
    }
    resetForm()
  }

  const defaultTrigger = mode === "create" ? (
    <Button>
      <Plus className="mr-2 size-4" />
      Add Contact
    </Button>
  ) : (
    <Button variant="ghost" size="sm">
      <Pencil className="mr-2 size-4" />
      Edit
    </Button>
  )

  return (
    <FormDialog
      title={mode === "create" ? "Add New Contact" : "Edit Contact"}
      description={mode === "create" ? "Add a new contact to your database." : "Update the contact information."}
      trigger={trigger !== undefined ? trigger : defaultTrigger}
      open={open ?? internalOpen}
      onOpenChange={handleDialogOpenChange}
      onSubmit={handleSubmit}
      onCancel={resetForm}
      submitLabel={mode === "create" ? "Add Contact" : "Save Changes"}
      submitDisabled={!firstName.trim() || !lastName.trim() || !email.trim()}
      maxWidth="md"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="firstName">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
            required
          />
          {fieldError("firstName") && (
            <p className="text-xs text-destructive">{fieldError("firstName")}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            required
          />
          {fieldError("lastName") && (
            <p className="text-xs text-destructive">{fieldError("lastName")}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            required
          />
          {fieldError("email") && (
            <p className="text-xs text-destructive">{fieldError("email")}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Corp"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="role">Role</Label>
          <Input
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="CEO"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as ContactStatus)}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(contactStatusConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldError("status") && (
            <p className="text-xs text-destructive">{fieldError("status")}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="vip, enterprise"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Address</Label>
        <Input
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          placeholder="Street address"
        />
        <Input
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
          placeholder="Apt, suite, etc. (optional)"
        />
        <div className="grid grid-cols-3 gap-2">
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
          />
          <Input
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="State"
          />
          <Input
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="ZIP"
          />
        </div>
      </div>
    </FormDialog>
  )
}
