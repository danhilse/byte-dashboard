import {
  PlayCircle,
  ClipboardList,
  Clock,
  ShieldCheck,
  RefreshCw,
  GitBranch,
  type LucideIcon,
} from "lucide-react"
import type { StepType, WorkflowStep } from "@/types"

export interface StepMeta {
  type: StepType
  label: string
  description: string
  icon: LucideIcon
}

export const stepRegistry: Record<StepType, StepMeta> = {
  trigger: {
    type: "trigger",
    label: "Trigger",
    description: "How the workflow starts",
    icon: PlayCircle,
  },
  assign_task: {
    type: "assign_task",
    label: "Assign Task",
    description: "Create and assign a task",
    icon: ClipboardList,
  },
  wait_for_task: {
    type: "wait_for_task",
    label: "Wait for Task",
    description: "Pause until a task is completed",
    icon: Clock,
  },
  wait_for_approval: {
    type: "wait_for_approval",
    label: "Wait for Approval",
    description: "Pause until approved or rejected",
    icon: ShieldCheck,
  },
  update_status: {
    type: "update_status",
    label: "Update Status",
    description: "Change the workflow status",
    icon: RefreshCw,
  },
  condition: {
    type: "condition",
    label: "Condition",
    description: "Branch based on a variable value",
    icon: GitBranch,
  },
}

export const stepTypeList: StepMeta[] = Object.values(stepRegistry)

const defaultConfigs: Record<StepType, WorkflowStep["config"]> = {
  trigger: { triggerType: "manual" },
  assign_task: {
    title: "",
    taskType: "standard",
    assignTo: { type: "role", role: "" },
    priority: "medium",
  },
  wait_for_task: { timeoutDays: 7 },
  wait_for_approval: { timeoutDays: 7 },
  update_status: { status: "completed" },
  condition: { field: "", branches: [] },
}

export function createDefaultStep(type: StepType): WorkflowStep {
  const meta = stepRegistry[type]
  return {
    id: crypto.randomUUID(),
    type,
    label: meta.label,
    config: { ...defaultConfigs[type] },
  } as WorkflowStep
}
