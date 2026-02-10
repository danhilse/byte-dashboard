"use client"

import { useCallback, useRef, useState, type FocusEvent } from "react"
import { FileStack, ListTodo, Plus, UserPlus, Workflow, type LucideIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { ContactFormDialog } from "@/components/contacts/contact-form-dialog"
import { TaskCreateDialog } from "@/components/tasks/task-create-dialog"
import { WorkflowDefinitionCreateDialog } from "@/components/workflow-builder/workflow-definition-create-dialog"
import { WorkflowCreateDialog } from "@/components/workflows/workflow-create-dialog"
import { Button } from "@/components/ui/button"
import { useOrgRole } from "@/hooks/use-org-role"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { Contact, Task } from "@/types"

interface QuickAddOption {
  id: string
  label: string
  icon: LucideIcon
  onSelect: () => void
}

export function QuickAddFab() {
  const router = useRouter()
  const { toast } = useToast()
  const { isAdmin } = useOrgRole()
  const containerRef = useRef<HTMLDivElement>(null)

  const [expanded, setExpanded] = useState(false)
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [definitionDialogOpen, setDefinitionDialogOpen] = useState(false)
  const quickAddWidthClass = "w-[220px]"
  const optionButtonClass = cn(
    "h-10 justify-start gap-2 rounded-full px-4 shadow-lg cursor-pointer",
    quickAddWidthClass,
    "transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:bg-accent hover:text-accent-foreground"
  )

  const closeMenu = () => setExpanded(false)

  const handleBlurCapture = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && containerRef.current?.contains(nextTarget)) {
      return
    }
    closeMenu()
  }

  const handleCreateContact = useCallback(
    async (contactData: Omit<Contact, "id" | "createdAt"> | Contact) => {
      try {
        const response = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contactData),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || "Failed to create contact")
        }

        toast({
          title: "Success",
          description: "Contact created successfully",
        })
        router.refresh()
      } catch (error) {
        console.error("Error creating contact:", error)
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to create contact. Please try again.",
          variant: "destructive",
        })
      }
    },
    [router, toast]
  )

  const handleCreateTask = useCallback(
    async (taskData: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
      try {
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || "Failed to create task")
        }

        toast({
          title: "Success",
          description: "Task created successfully",
        })
        router.refresh()
      } catch (error) {
        console.error("Error creating task:", error)
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to create task. Please try again.",
          variant: "destructive",
        })
      }
    },
    [router, toast]
  )

  const handleCreateWorkflow = useCallback(
    async (data: { contactId: string; workflowDefinitionId?: string; status?: string }) => {
      try {
        const startsImmediately = Boolean(data.workflowDefinitionId)
        const endpoint = startsImmediately ? "/api/workflows/trigger" : "/api/workflows"
        const payload = startsImmediately
          ? {
              contactId: data.contactId,
              workflowDefinitionId: data.workflowDefinitionId,
            }
          : data

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const payloadError = await response.json().catch(() => null)
          throw new Error(
            payloadError?.error ||
              (startsImmediately ? "Failed to start workflow" : "Failed to create workflow")
          )
        }

        toast({
          title: startsImmediately ? "Workflow started" : "Success",
          description: startsImmediately
            ? "Workflow execution started successfully"
            : "Workflow created successfully",
        })
        router.refresh()
      } catch (error) {
        console.error("Error creating workflow:", error)
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to create workflow. Please try again.",
          variant: "destructive",
        })
      }
    },
    [router, toast]
  )

  const handleDefinitionCreated = useCallback(
    () => {
      router.refresh()
    },
    [router]
  )

  const quickAddOptions: QuickAddOption[] = [
    ...(isAdmin
      ? [
          {
            id: "definition",
            label: "Add Workflow Definition",
            icon: FileStack,
            onSelect: () => setDefinitionDialogOpen(true),
          },
        ]
      : []),
    {
      id: "contact",
      label: "Add Contact",
      icon: UserPlus,
      onSelect: () => setContactDialogOpen(true),
    },
    {
      id: "workflow",
      label: "Run Workflow",
      icon: Workflow,
      onSelect: () => setWorkflowDialogOpen(true),
    },
    {
      id: "task",
      label: "Add Task",
      icon: ListTodo,
      onSelect: () => setTaskDialogOpen(true),
    },
  ]

  return (
    <>
      <div
        ref={containerRef}
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
        onMouseLeave={closeMenu}
        onFocusCapture={() => setExpanded(true)}
        onBlurCapture={handleBlurCapture}
      >
        <div
          className={cn(
            "flex flex-col items-end gap-2",
            expanded ? "pointer-events-auto" : "pointer-events-none"
          )}
        >
          {quickAddOptions.map((option, index) => (
            <div
              key={option.id}
              className={cn(
                "will-change-transform transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                expanded ? "translate-y-0 scale-100 opacity-100" : "translate-y-14 scale-95 opacity-0"
              )}
              style={{
                transitionDelay: expanded
                  ? `${80 + (quickAddOptions.length - 1 - index) * 65}ms`
                  : `${index * 45}ms`,
              }}
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className={optionButtonClass}
                onClick={() => {
                  closeMenu()
                  option.onSelect()
                }}
              >
                <option.icon className="size-4" />
                {option.label}
              </Button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          className={cn(
            "h-12 overflow-hidden rounded-full bg-primary text-primary-foreground shadow-xl cursor-pointer transition-all ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-2xl hover:bg-primary/90",
            expanded ? "delay-0 duration-400" : "delay-[220ms] duration-300",
            expanded ? `${quickAddWidthClass} justify-between px-4` : "w-12 justify-center px-0"
          )}
          onMouseEnter={() => setExpanded(true)}
          onClick={() => setExpanded((previous) => !previous)}
          aria-haspopup="menu"
          aria-expanded={expanded}
          aria-label="Quick Add"
        >
          {expanded ? <span className="whitespace-nowrap text-sm font-semibold">Quick Add</span> : null}
          <Plus className="size-5 shrink-0" />
        </Button>
      </div>

      <ContactFormDialog
        mode="create"
        onSubmit={handleCreateContact}
        trigger={null}
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
      />
      <WorkflowCreateDialog
        onCreateWorkflow={handleCreateWorkflow}
        trigger={null}
        open={workflowDialogOpen}
        onOpenChange={setWorkflowDialogOpen}
      />
      <TaskCreateDialog
        onCreateTask={handleCreateTask}
        trigger={null}
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
      />
      {isAdmin && (
        <WorkflowDefinitionCreateDialog
          onDefinitionCreated={handleDefinitionCreated}
          trigger={null}
          open={definitionDialogOpen}
          onOpenChange={setDefinitionDialogOpen}
        />
      )}
    </>
  )
}
