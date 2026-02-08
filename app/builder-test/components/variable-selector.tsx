"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import type { WorkflowVariable } from "../types/workflow-v2"
import { filterVariablesByDataType, formatVariableRef, getVariableLabel } from "@/lib/workflow-builder-v2/variable-utils"

interface VariableSelectorProps {
  value: string
  onChange: (value: string) => void
  variables: WorkflowVariable[]
  filterByDataType?: string | string[]
  allowManualEntry?: boolean
  placeholder?: string
  className?: string
}

export function VariableSelector({
  value,
  onChange,
  variables,
  filterByDataType,
  allowManualEntry = true,
  placeholder = "Select variable...",
  className,
}: VariableSelectorProps) {
  const [open, setOpen] = useState(false)
  const [manualEntry, setManualEntry] = useState(false)
  const [manualValue, setManualValue] = useState("")

  // Filter variables by data type
  const filteredOptions = filterByDataType
    ? filterVariablesByDataType(variables, filterByDataType)
    : variables.map((v) => ({
        variableId: v.id,
        label: v.name,
        dataType: v.dataType || "text",
      }))

  // Group by source
  const triggerVars = filteredOptions.filter((opt) => {
    const variable = variables.find((v) => v.id === opt.variableId)
    return variable?.source.type === "trigger"
  })
  const actionVars = filteredOptions.filter((opt) => {
    const variable = variables.find((v) => v.id === opt.variableId)
    return variable?.source.type === "action_output"
  })
  const customVars = filteredOptions.filter((opt) => {
    const variable = variables.find((v) => v.id === opt.variableId)
    return variable?.source.type === "custom"
  })

  // Check if current value is a variable reference
  const isVariableRef = value.startsWith("var-")
  const displayValue = isVariableRef
    ? getVariableLabel(value, variables)
    : value

  const handleSelect = (variableId: string, fieldKey?: string) => {
    const ref = formatVariableRef(variableId, fieldKey)
    onChange(ref)
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
          placeholder="Enter value..."
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
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search variables..." />
          <CommandList>
            <CommandEmpty>No variables found.</CommandEmpty>

            {/* Trigger Variables */}
            {triggerVars.length > 0 && (
              <CommandGroup heading="From Trigger">
                {triggerVars.map((opt) => (
                  <CommandItem
                    key={formatVariableRef(opt.variableId, opt.fieldKey)}
                    onSelect={() => handleSelect(opt.variableId, opt.fieldKey)}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        "size-4",
                        value === formatVariableRef(opt.variableId, opt.fieldKey)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="text-sm">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {opt.dataType}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Action Variables */}
            {actionVars.length > 0 && (
              <CommandGroup heading="From Actions">
                {actionVars.map((opt) => (
                  <CommandItem
                    key={formatVariableRef(opt.variableId, opt.fieldKey)}
                    onSelect={() => handleSelect(opt.variableId, opt.fieldKey)}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        "size-4",
                        value === formatVariableRef(opt.variableId, opt.fieldKey)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="text-sm">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {opt.dataType}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Custom Variables */}
            {customVars.length > 0 && (
              <CommandGroup heading="Custom">
                {customVars.map((opt) => (
                  <CommandItem
                    key={formatVariableRef(opt.variableId, opt.fieldKey)}
                    onSelect={() => handleSelect(opt.variableId, opt.fieldKey)}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        "size-4",
                        value === formatVariableRef(opt.variableId, opt.fieldKey)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="text-sm">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {opt.dataType}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Manual Entry Option */}
            {allowManualEntry && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false)
                    setManualEntry(true)
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="size-4" />
                  <span className="text-sm">Enter value manually...</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
