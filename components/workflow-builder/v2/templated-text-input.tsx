"use client"

import { useMemo, useRef, useState } from "react"
import { Braces } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import type { WorkflowVariable } from "../types/workflow-v2"

interface TemplatedTextInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  variables: WorkflowVariable[]
  placeholder?: string
  multiline?: boolean
  rows?: number
  className?: string
}

interface TemplateOption {
  id: string
  label: string
  token: string
  dataType: string
}

function getContactTemplateOptions(variables: WorkflowVariable[]): TemplateOption[] {
  const contact = variables.find((variable) => variable.id === "var-contact")
  if (!contact?.fields || contact.fields.length === 0) {
    return []
  }

  return contact.fields.map((field) => ({
    id: `${contact.id}.${field.key}`,
    label: `${contact.name} -> ${field.label}`,
    token: `{{contact.${field.key}}}`,
    dataType: field.dataType,
  }))
}

export function TemplatedTextInput({
  id,
  value,
  onChange,
  variables,
  placeholder,
  multiline = false,
  rows = 4,
  className,
}: TemplatedTextInputProps) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selectionRef = useRef<{ start: number; end: number } | null>(null)

  const options = useMemo(() => getContactTemplateOptions(variables), [variables])
  const hasOptions = options.length > 0
  const triggerPositionClass = multiline
    ? "right-2 top-2"
    : "right-1.5 top-1/2 -translate-y-1/2"

  const getActiveElement = () => (multiline ? textareaRef.current : inputRef.current)

  const captureSelection = () => {
    const element = getActiveElement()
    if (!element) return

    const start = element.selectionStart ?? value.length
    const end = element.selectionEnd ?? start
    selectionRef.current = { start, end }
  }

  const insertToken = (token: string) => {
    const fallbackCursor = value.length
    const savedSelection = selectionRef.current ?? {
      start: fallbackCursor,
      end: fallbackCursor,
    }
    const nextValue =
      value.slice(0, savedSelection.start) +
      token +
      value.slice(savedSelection.end)

    onChange(nextValue)
    setOpen(false)

    const cursor = savedSelection.start + token.length
    requestAnimationFrame(() => {
      const element = getActiveElement()
      if (!element) return
      element.focus()
      element.setSelectionRange(cursor, cursor)
      selectionRef.current = { start: cursor, end: cursor }
    })
  }

  return (
    <div className="group relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!hasOptions}
            title="Insert variable"
            aria-label="Insert variable"
            className={cn(
              "absolute z-10 size-6 p-0 text-muted-foreground opacity-30 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
              triggerPositionClass
            )}
            onClick={captureSelection}
          >
            <Braces className="size-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[320px] p-0">
          <Command>
            <CommandInput placeholder="Search variables..." />
            <CommandList>
              <CommandEmpty>No variables available.</CommandEmpty>
              <CommandGroup heading="Contact">
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={`${option.label} ${option.token}`}
                    onSelect={() => insertToken(option.token)}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-sm">{option.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {option.dataType}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {multiline ? (
        <Textarea
          id={id}
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onSelect={captureSelection}
          onKeyUp={captureSelection}
          onClick={captureSelection}
          placeholder={placeholder}
          rows={rows}
          className={cn("pr-10", className)}
        />
      ) : (
        <Input
          id={id}
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onSelect={captureSelection}
          onKeyUp={captureSelection}
          onClick={captureSelection}
          placeholder={placeholder}
          className={cn("pr-10", className)}
        />
      )}
    </div>
  )
}
