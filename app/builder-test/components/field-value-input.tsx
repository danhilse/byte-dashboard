"use client"

import type { FieldInputType } from "@/lib/field-input-types"
import type { WorkflowStatus } from "../types/workflow-v2"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { allContactStatuses, contactStatusConfig } from "@/lib/status-config"
import { allRoles, roleConfig } from "@/lib/roles-config"

interface FieldValueInputProps {
  inputType: FieldInputType
  value: string
  onChange: (value: string) => void
  statuses?: WorkflowStatus[]
  className?: string
  placeholder?: string
}

export function FieldValueInput({
  inputType,
  value,
  onChange,
  statuses = [],
  className,
  placeholder,
}: FieldValueInputProps) {
  switch (inputType) {
    case "textarea":
      return (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Enter value..."}
          rows={3}
          className={className}
        />
      )

    case "email":
      return (
        <Input
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "email@example.com"}
          className={className}
        />
      )

    case "tel":
      return (
        <Input
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "(555) 123-4567"}
          className={className}
        />
      )

    case "status": {
      const sortedStatuses = [...statuses].sort((a, b) => a.order - b.order)
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className={className}>
            <SelectValue placeholder={placeholder || "Select status..."} />
          </SelectTrigger>
          <SelectContent>
            {sortedStatuses.length === 0 ? (
              <SelectItem value="_none" disabled>
                No statuses defined
              </SelectItem>
            ) : (
              sortedStatuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  <div className="flex items-center gap-2">
                    {status.color && (
                      <div
                        className="size-2 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                    )}
                    {status.label}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )
    }

    case "contact_status":
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className={className}>
            <SelectValue placeholder={placeholder || "Select status..."} />
          </SelectTrigger>
          <SelectContent>
            {allContactStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {contactStatusConfig[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case "priority":
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className={className}>
            <SelectValue placeholder={placeholder || "Select priority..."} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      )

    case "role":
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className={className}>
            <SelectValue placeholder={placeholder || "Select role..."} />
          </SelectTrigger>
          <SelectContent>
            {allRoles.map((role) => (
              <SelectItem key={role} value={role}>
                {roleConfig[role].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case "days_after":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "0"}
            className={className}
          />
          <span className="shrink-0 text-xs text-muted-foreground">
            days after step runs
          </span>
        </div>
      )

    case "text":
    default:
      return (
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Enter value..."}
          className={className}
        />
      )
  }
}
