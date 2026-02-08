"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Mail, User, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

interface EmailValueSelectorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

// Mock data - in production, these would come from your database
const mockOrgUsers = [
  { id: "user-1", name: "John Smith", email: "john@company.com", role: "Admin" },
  { id: "user-2", name: "Sarah Johnson", email: "sarah@company.com", role: "Manager" },
  { id: "user-3", name: "Mike Chen", email: "mike@company.com", role: "Member" },
  { id: "user-4", name: "Emily Davis", email: "emily@company.com", role: "Support" },
]

const mockContacts = [
  { id: "contact-1", name: "Alice Williams", email: "alice@example.com", company: "Acme Corp" },
  { id: "contact-2", name: "Bob Martinez", email: "bob@techstart.io", company: "TechStart" },
  { id: "contact-3", name: "Carol Anderson", email: "carol@design.co", company: "Design Co" },
  { id: "contact-4", name: "David Lee", email: "david@consulting.com", company: "Lee Consulting" },
]

export function EmailValueSelector({
  value,
  onChange,
  placeholder = "Select email or enter manually...",
  className,
}: EmailValueSelectorProps) {
  const [open, setOpen] = useState(false)
  const [manualEntry, setManualEntry] = useState(false)
  const [manualValue, setManualValue] = useState("")

  // Determine if current value is from a known source
  const selectedUser = mockOrgUsers.find((u) => u.email === value)
  const selectedContact = mockContacts.find((c) => c.email === value)

  const displayValue = selectedUser
    ? `${selectedUser.name} (${selectedUser.email})`
    : selectedContact
      ? `${selectedContact.name} (${selectedContact.email})`
      : value

  const handleSelect = (email: string) => {
    onChange(email)
    setOpen(false)
  }

  const handleManualEntry = () => {
    if (manualValue.trim()) {
      onChange(manualValue.trim())
      setManualValue("")
      setManualEntry(false)
      setOpen(false)
    }
  }

  // If in manual entry mode, show input
  if (manualEntry) {
    return (
      <div className="flex gap-2">
        <Input
          value={manualValue}
          onChange={(e) => setManualValue(e.target.value)}
          placeholder="Enter email address..."
          type="email"
          className={className}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleManualEntry()
            } else if (e.key === "Escape") {
              setManualEntry(false)
              setManualValue("")
            }
          }}
          autoFocus
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleManualEntry}
          disabled={!manualValue.trim()}
        >
          Save
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setManualEntry(false)
            setManualValue("")
          }}
        >
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          <span className="truncate">
            {displayValue || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[450px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search emails..." />
          <CommandList>
            <CommandEmpty>No emails found.</CommandEmpty>

            {/* Organization Users */}
            <CommandGroup heading="Organization Users">
              {mockOrgUsers.map((user) => (
                <CommandItem
                  key={user.id}
                  onSelect={() => handleSelect(user.email)}
                  className="flex items-center gap-3"
                >
                  <Check
                    className={cn(
                      "size-4",
                      value === user.email ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="size-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.name}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {user.role}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

            {/* Contacts */}
            <CommandGroup heading="Contacts">
              {mockContacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  onSelect={() => handleSelect(contact.email)}
                  className="flex items-center gap-3"
                >
                  <Check
                    className={cn(
                      "size-4",
                      value === contact.email ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                    <Users className="size-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{contact.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {contact.company}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {contact.email}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

            {/* Manual Entry Option */}
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false)
                  setManualEntry(true)
                }}
                className="flex items-center gap-3"
              >
                <Mail className="size-4" />
                <span>Enter email manually...</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
