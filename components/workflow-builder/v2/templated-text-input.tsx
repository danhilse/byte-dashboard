"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { Braces } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import type { WorkflowVariable } from "../types/workflow-v2"
import { buildCustomVariableTokenKeyMap } from "@/lib/workflow-builder-v2/template-variable-utils"

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
  group: "Workflow" | "Contact" | "Custom" | "From Actions"
  label: string
  token: string
  dataType: string
}

const TEMPLATE_TOKEN_PATTERN = /(\{\{[^}]+\}\})/g
const TOKEN_EMPHASIS_STYLE = {
  textShadow: "0 0 0 currentColor, 0.4px 0 0 currentColor",
} as const

const GROUP_ORDER: TemplateOption["group"][] = [
  "Workflow",
  "Contact",
  "Custom",
  "From Actions",
]

function renderHighlightedText(value: string, placeholder?: string): ReactNode {
  if (!value) {
    return <span className="text-muted-foreground">{placeholder}</span>
  }

  const parts = value.split(TEMPLATE_TOKEN_PATTERN)

  return parts.map((part, index) => {
    if (!part) return null

    const isToken = part.startsWith("{{") && part.endsWith("}}")

    return (
      <span
        key={`${part}-${index}`}
        style={isToken ? TOKEN_EMPHASIS_STYLE : undefined}
      >
        {part}
      </span>
    )
  })
}

function getTemplateOptions(variables: WorkflowVariable[]): TemplateOption[] {
  const customVariableKeyMap = buildCustomVariableTokenKeyMap(variables)
  const options: TemplateOption[] = [
    {
      id: "workflow.name",
      group: "Workflow",
      label: "Workflow -> Name",
      token: "{{workflow.name}}",
      dataType: "text",
    },
    {
      id: "workflow.status",
      group: "Workflow",
      label: "Workflow -> Status",
      token: "{{workflow.status}}",
      dataType: "text",
    },
  ]

  const contact = variables.find((variable) => variable.id === "var-contact")
  if (contact?.fields?.length) {
    for (const field of contact.fields) {
      options.push({
        id: `${contact.id}.${field.key}`,
        group: "Contact",
        label: `${contact.name} -> ${field.label}`,
        token: `{{contact.${field.key}}}`,
        dataType: field.dataType,
      })
    }
  }

  for (const variable of variables) {
    if (variable.id === "var-contact") continue

    if (variable.source.type === "custom") {
      const key = customVariableKeyMap.get(variable.id) ?? variable.id
      options.push({
        id: variable.id,
        group: "Custom",
        label: variable.name,
        token: `{{custom.${key}}}`,
        dataType: variable.dataType ?? "text",
      })
      continue
    }

    if (variable.source.type !== "action_output") continue

    if (variable.fields?.length) {
      for (const field of variable.fields) {
        options.push({
          id: `${variable.id}.${field.key}`,
          group: "From Actions",
          label: `${variable.name} -> ${field.label}`,
          token: `{{${variable.source.actionId}.${field.key}}}`,
          dataType: field.dataType,
        })
      }
      continue
    }

    options.push({
      id: variable.id,
      group: "From Actions",
      label: variable.name,
      token: `{{${variable.source.actionId}.value}}`,
      dataType: variable.dataType ?? "text",
    })
  }

  const seenTokens = new Set<string>()
  return options.filter((option) => {
    if (seenTokens.has(option.token)) return false
    seenTokens.add(option.token)
    return true
  })
}

function getSubmenuOptionLabel(option: TemplateOption): string {
  if (option.group === "Contact" && option.label.startsWith("Contact -> ")) {
    return option.label.replace("Contact -> ", "")
  }

  if (option.group === "Workflow" && option.label.startsWith("Workflow -> ")) {
    return option.label.replace("Workflow -> ", "")
  }

  return option.label
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
  const [searchValue, setSearchValue] = useState("")
  const [submenuSide, setSubmenuSide] = useState<"left" | "right">("left")
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selectionRef = useRef<{ start: number; end: number } | null>(null)

  const options = useMemo(() => getTemplateOptions(variables), [variables])
  const hasOptions = options.length > 0
  const triggerPositionClass = multiline
    ? "right-2 top-2"
    : "right-1.5 top-1/2 -translate-y-1/2"
  const groupedOptions = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      items: options.filter((option) => option.group === group),
    })).filter((entry) => entry.items.length > 0)
  }, [options])
  const normalizedSearchValue = searchValue.trim().toLowerCase()
  const isSearching = normalizedSearchValue.length > 0
  const searchedOptions = useMemo(() => {
    if (!isSearching) return []

    return options.filter((option) => {
      const haystack = `${option.group} ${option.label} ${option.token} ${option.dataType}`.toLowerCase()
      return haystack.includes(normalizedSearchValue)
    })
  }, [isSearching, normalizedSearchValue, options])

  useEffect(() => {
    if (!open) return

    const updateSubmenuSide = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return

      const minSubmenuWidth = 320
      const spaceRight = window.innerWidth - rect.right
      const spaceLeft = rect.left

      if (spaceRight < minSubmenuWidth && spaceLeft > spaceRight) {
        setSubmenuSide("left")
        return
      }

      setSubmenuSide("right")
    }

    updateSubmenuSide()
    window.addEventListener("resize", updateSubmenuSide)
    return () => window.removeEventListener("resize", updateSubmenuSide)
  }, [open])

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
      <DropdownMenu
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) {
            setSearchValue("")
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="ghost"
            size="sm"
            disabled={!hasOptions}
            title="Insert variable"
            aria-label="Insert variable"
            className={cn(
              "absolute z-30 size-6 p-0 text-muted-foreground opacity-30 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
              triggerPositionClass
            )}
            onClick={captureSelection}
          >
            <Braces className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[260px] p-0">
          <div className="border-b p-2">
            <Input
              placeholder="Search variables..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              className="h-8"
            />
          </div>

          {isSearching ? (
            <div className="max-h-72 overflow-auto p-1">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Search Results
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {searchedOptions.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">No matching variables.</p>
              ) : (
                searchedOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.token}
                    className="flex items-center justify-between gap-2"
                    onSelect={() => insertToken(option.token)}
                  >
                    <span className="truncate">{option.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {option.group}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          ) : (
            <div className="max-h-72 overflow-auto p-1">
              {groupedOptions.map((groupEntry) => (
                <DropdownMenuSub key={groupEntry.group}>
                  <DropdownMenuSubTrigger className="flex items-center justify-between gap-2">
                    <span>{groupEntry.group}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {groupEntry.items.length}
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    sideOffset={8}
                    className="w-[320px] max-h-72 overflow-auto"
                  >
                    <DropdownMenuLabel>{groupEntry.group}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {groupEntry.items.map((option) => (
                      <DropdownMenuItem
                        key={option.token}
                        className="flex items-center justify-between gap-2"
                        onSelect={() => insertToken(option.token)}
                      >
                        <span className="truncate">{getSubmenuOptionLabel(option)}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {option.dataType}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ))}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {multiline ? (
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden px-3 py-2 pr-10 text-sm whitespace-pre-wrap break-words"
          >
            {renderHighlightedText(value, placeholder)}
          </div>
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
            className={cn(
              "relative z-10 bg-transparent text-transparent caret-foreground placeholder:text-transparent pr-10",
              className
            )}
          />
        </div>
      ) : (
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 flex items-center overflow-hidden px-3 pr-10 text-sm whitespace-pre"
          >
            {renderHighlightedText(value, placeholder)}
          </div>
          <Input
            id={id}
            ref={inputRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onSelect={captureSelection}
            onKeyUp={captureSelection}
            onClick={captureSelection}
            placeholder={placeholder}
            className={cn(
              "relative z-10 bg-transparent text-transparent caret-foreground placeholder:text-transparent pr-10",
              className
            )}
          />
        </div>
      )}
    </div>
  )
}
