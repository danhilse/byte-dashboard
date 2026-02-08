"use client"

import { useState } from "react"
import type { WorkflowDefinitionV2 } from "../types/workflow-v2"
import { Button } from "@/components/ui/button"
import { Copy, Download, Check } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface WorkflowJsonExportProps {
  workflow: WorkflowDefinitionV2
}

export function WorkflowJsonExport({ workflow }: WorkflowJsonExportProps) {
  const [copied, setCopied] = useState(false)

  const jsonString = JSON.stringify(workflow, null, 2)

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
    <div className="h-64 bg-muted/40">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div>
          <h3 className="text-sm font-semibold">JSON Export</h3>
          <p className="text-xs text-muted-foreground">
            Debug panel showing workflow definition
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      <ScrollArea className="h-[calc(100%-3rem)]">
        <pre className="p-4 text-xs">
          <code>{jsonString}</code>
        </pre>
      </ScrollArea>
    </div>
  )
}
