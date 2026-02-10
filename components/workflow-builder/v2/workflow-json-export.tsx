"use client"

import { useState } from "react"
import type { WorkflowDefinitionV2 } from "../types/workflow-v2"
import type { BuilderCommand } from "@/lib/workflow-builder-v2/builder-command-serializer"
import { Button } from "@/components/ui/button"
import { Copy, Download, Check } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface WorkflowJsonExportProps {
  workflow: WorkflowDefinitionV2
  commands?: BuilderCommand[]
  onClearCommands?: () => void
}

export function WorkflowJsonExport({
  workflow,
  commands,
  onClearCommands,
}: WorkflowJsonExportProps) {
  const [copied, setCopied] = useState(false)
  const commandCount = commands?.length ?? 0

  const exportPayload = commands
    ? {
        workflow,
        definitionCommandLog: commands,
      }
    : workflow
  const jsonString = JSON.stringify(exportPayload, null, 2)

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${workflow.name.toLowerCase().replace(/\s+/g, "-")}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/40">
      <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">JSON Export</h3>
          <p className="text-xs text-muted-foreground">
            Debug panel showing workflow definition
            {commands ? ` + ${commandCount} definition command(s)` : ""}
          </p>
          {commands && (
            <p className="mt-1 text-xs text-muted-foreground">
              The command log is diagnostic only. Clearing it does not modify
              the workflow definition.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onClearCommands && commands && commands.length > 0 && (
            <Button variant="outline" size="sm" onClick={onClearCommands}>
              Clear Command Log
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="mr-2 size-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 size-4" />
                Copy
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-2 size-4" />
            Download
          </Button>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <pre className="p-4 text-xs">
          <code>{jsonString}</code>
        </pre>
      </ScrollArea>
    </div>
  )
}
