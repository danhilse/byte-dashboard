"use client"

import type { WorkflowTrigger, TriggerType } from "../types/workflow-v2"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import type { DefinitionStatus } from "@/types"
import {
  Calendar,
  ChevronDown,
  Code,
  Clock,
  Mail,
  Play,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Webhook,
} from "lucide-react"

interface TriggerConfigProps {
  trigger: WorkflowTrigger
  statuses: DefinitionStatus[]
  onChange: (trigger: WorkflowTrigger) => void
}

interface TriggerMenuOption {
  id: string
  label: string
  icon: LucideIcon
  triggerType?: TriggerType
  disabled?: boolean
}

interface TriggerMenuCategory {
  id: string
  label: string
  icon: LucideIcon
  options: TriggerMenuOption[]
}

const CONTACT_FIELD_OPTIONS = [
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "company", label: "Company" },
  { value: "role", label: "Role" },
  { value: "status", label: "Status" },
  { value: "tags", label: "Tags" },
]

const UNSET_STATUS_VALUE = "__unset__"

const TRIGGER_MENU_CATEGORIES: TriggerMenuCategory[] = [
  {
    id: "general",
    label: "General",
    icon: Play,
    options: [
      {
        id: "manual",
        label: "Manual Start",
        icon: Play,
        triggerType: "manual",
      },
    ],
  },
  {
    id: "contacts",
    label: "Contacts",
    icon: UserPlus,
    options: [
      {
        id: "contact_created",
        label: "When Contact Is Created",
        icon: UserPlus,
        triggerType: "contact_created",
      },
      {
        id: "contact_field_changed",
        label: "When Contact Fields Change",
        icon: UserCheck,
        triggerType: "contact_field_changed",
      },
      {
        id: "record_state_changed",
        label: "Record State Changed (Coming Soon)",
        icon: RefreshCw,
        disabled: true,
      },
    ],
  },
  {
    id: "deadlines",
    label: "Deadlines",
    icon: Clock,
    options: [
      {
        id: "sla_due_breach",
        label: "SLA / Due-Date Breach (Coming Soon)",
        icon: Clock,
        disabled: true,
      },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Webhook,
    options: [
      {
        id: "webhook_received",
        label: "Webhook Received (Coming Soon)",
        icon: Webhook,
        disabled: true,
      },
      {
        id: "form_submission",
        label: "When Form Submitted (Coming Soon)",
        icon: Webhook,
        triggerType: "form_submission",
        disabled: true,
      },
      {
        id: "api",
        label: "API Call (Coming Soon)",
        icon: Code,
        triggerType: "api",
        disabled: true,
      },
      {
        id: "inbound_communication",
        label: "Inbound Communication (Coming Soon)",
        icon: Mail,
        disabled: true,
      },
    ],
  },
  {
    id: "schedule",
    label: "Schedule",
    icon: Calendar,
    options: [
      {
        id: "schedule_recurring",
        label: "Schedule / Recurring (Coming Soon)",
        icon: Calendar,
        disabled: true,
      },
    ],
  },
  {
    id: "approvals",
    label: "Approvals",
    icon: ShieldCheck,
    options: [
      {
        id: "approval_decision_submitted",
        label: "Approval Decision Submitted (Coming Soon)",
        icon: ShieldCheck,
        disabled: true,
      },
    ],
  },
]

export function TriggerConfig({ trigger, statuses, onChange }: TriggerConfigProps) {
  const selectedOption = TRIGGER_MENU_CATEGORIES.flatMap((category) => category.options)
    .find((option) => option.triggerType === trigger.type)

  const createTrigger = (
    type: TriggerType,
    initialStatus?: string,
    watchedFields?: string[]
  ): WorkflowTrigger => {
    switch (type) {
      case "manual":
        return initialStatus ? { type: "manual", initialStatus } : { type: "manual" }
      case "contact_created":
        return initialStatus
          ? { type: "contact_created", initialStatus }
          : { type: "contact_created" }
      case "contact_field_changed":
        return initialStatus
          ? {
              type: "contact_field_changed",
              watchedFields: watchedFields ?? [],
              initialStatus,
            }
          : { type: "contact_field_changed", watchedFields: watchedFields ?? [] }
      case "form_submission":
        return initialStatus
          ? { type: "form_submission", formId: "", initialStatus }
          : { type: "form_submission", formId: "" }
      case "api":
        return initialStatus ? { type: "api", initialStatus } : { type: "api" }
    }
  }

  const handleTypeChange = (type: TriggerType) => {
    onChange(
      createTrigger(
        type,
        trigger.initialStatus,
        type === "contact_field_changed" && trigger.type === "contact_field_changed"
          ? trigger.watchedFields
          : []
      )
    )
  }

  const toggleWatchedField = (field: string, checked: boolean) => {
    if (trigger.type !== "contact_field_changed") {
      return
    }

    const nextFields = checked
      ? [...new Set([...trigger.watchedFields, field])]
      : trigger.watchedFields.filter((item) => item !== field)

    onChange(
      createTrigger(
        "contact_field_changed",
        trigger.initialStatus,
        nextFields
      )
    )
  }

  const handleInitialStatusChange = (value: string) => {
    const initialStatus =
      value === UNSET_STATUS_VALUE
        ? undefined
        : value

    onChange(
      createTrigger(
        trigger.type,
        initialStatus,
        trigger.type === "contact_field_changed" ? trigger.watchedFields : undefined
      )
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="trigger-type">Trigger Type</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              id="trigger-type"
              variant="outline"
              className="w-full justify-between font-normal"
            >
              <span className="flex items-center gap-2">
                {selectedOption ? (
                  <>
                    <selectedOption.icon className="size-4" />
                    {selectedOption.label}
                  </>
                ) : (
                  "Select trigger"
                )}
              </span>
              <ChevronDown className="size-4 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {TRIGGER_MENU_CATEGORIES.map((category) => (
              <DropdownMenuSub key={category.id}>
                <DropdownMenuSubTrigger>
                  <category.icon className="size-4" />
                  {category.label}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-80">
                  {category.options.map((option) => (
                    <DropdownMenuItem
                      key={option.id}
                      disabled={option.disabled}
                      onClick={() => option.triggerType && handleTypeChange(option.triggerType)}
                      className={cn(
                        "flex items-center gap-2",
                        option.triggerType === trigger.type && "bg-accent"
                      )}
                    >
                      <option.icon className="size-4" />
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Type-specific config */}
      {trigger.type === "manual" && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <p>Workflow will be started manually by a user selecting a contact.</p>
        </div>
      )}

      {trigger.type === "contact_created" && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <p>Workflow starts automatically when a new contact is created.</p>
        </div>
      )}

      {trigger.type === "contact_field_changed" && (
        <div className="space-y-2">
          <Label>Fields to Watch</Label>
          <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
            {CONTACT_FIELD_OPTIONS.map((field) => (
              <label key={field.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={trigger.watchedFields.includes(field.value)}
                  onCheckedChange={(checked) =>
                    toggleWatchedField(field.value, Boolean(checked))
                  }
                />
                <span>{field.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {trigger.watchedFields.length === 0
              ? "No fields selected: workflow will trigger on any contact field change."
              : "Workflow will trigger when any selected field changes."}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="trigger-initial-status">Workflow Status At Trigger (Optional)</Label>
        <Select
          value={trigger.initialStatus ?? UNSET_STATUS_VALUE}
          onValueChange={handleInitialStatusChange}
        >
          <SelectTrigger id="trigger-initial-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNSET_STATUS_VALUE}>--</SelectItem>
            {[...statuses]
              .sort((a, b) => a.order - b.order)
              .map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Default is no status (`--`).
        </p>
      </div>

      {trigger.type === "form_submission" && (
        <div className="space-y-2">
          <Label htmlFor="form-id">Form ID</Label>
          <Input
            id="form-id"
            value={trigger.formId}
            onChange={(e) =>
              onChange({ type: "form_submission", formId: e.target.value })
            }
            placeholder="Enter external form ID"
          />
          <p className="text-xs text-muted-foreground">
            Workflow starts when this form is submitted
          </p>
        </div>
      )}

      {trigger.type === "api" && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <p>Workflow will be started via API call with contact ID.</p>
          <p className="mt-2">
            <code className="rounded bg-muted px-1 py-0.5">
              POST /api/workflows/{"{workflow-id}"}/start
            </code>
          </p>
        </div>
      )}
    </div>
  )
}
