"use client"

import { useState, useEffect } from "react"
import { mockWorkflowsV2 } from "@/lib/workflow-builder-v2/mock-workflows-v2"
import type { WorkflowDefinitionV2 } from "./types/workflow-v2"
import { WorkflowBuilderV2 } from "./components/workflow-builder-v2"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function BuilderTestPage() {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(
    mockWorkflowsV2[0].id
  )
  const [workflow, setWorkflow] = useState<WorkflowDefinitionV2>(
    // Deep clone to avoid mutation
    JSON.parse(JSON.stringify(mockWorkflowsV2[0]))
  )

  const handleWorkflowChange = (workflowId: string) => {
    const found = mockWorkflowsV2.find((w) => w.id === workflowId)
    if (found) {
      setSelectedWorkflowId(workflowId)
      // Deep clone to avoid mutation between workflow instances
      setWorkflow(JSON.parse(JSON.stringify(found)))
    }
  }

  const handleWorkflowUpdate = (updated: WorkflowDefinitionV2) => {
    setWorkflow(updated)
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b bg-muted/40 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Workflow Builder V2 Prototype</h1>
            <p className="text-sm text-muted-foreground">
              Frontend-only prototype with new conceptual model
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Load Example:</span>
              <Select value={selectedWorkflowId} onValueChange={handleWorkflowChange}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mockWorkflowsV2.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Builder */}
      <div className="flex-1 overflow-hidden">
        <WorkflowBuilderV2
          workflow={workflow}
          onWorkflowChange={handleWorkflowUpdate}
        />
      </div>
    </div>
  )
}
