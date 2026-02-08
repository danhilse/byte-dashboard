// ============================================================================
// Condition Registry - Metadata for all advancement condition types
// ============================================================================

import type {
  SimpleConditionType,
  AdvancementCondition,
  SimpleCondition,
} from "@/app/builder-test/types/workflow-v2"
import {
  Zap,
  Clock,
  CheckCircle,
  GitBranch,
  FileText,
  Timer,
  Hand,
  CheckCheck,
  ListChecks,
  type LucideIcon,
} from "lucide-react"

export interface ConditionMetadata {
  type: SimpleConditionType
  label: string
  icon: LucideIcon
  description: string
  badgeText: string // Short text for step card badge
  defaultConfig: SimpleCondition
}

export const conditionRegistry: Record<SimpleConditionType, ConditionMetadata> = {
  automatic: {
    type: "automatic",
    label: "Automatic",
    icon: Zap,
    description: "Advance immediately after actions complete",
    badgeText: "Auto",
    defaultConfig: {
      type: "automatic",
    },
  },
  when_task_completed: {
    type: "when_task_completed",
    label: "When Task Completed",
    icon: CheckCircle,
    description: "Advance when a specific task is completed",
    badgeText: "When task done",
    defaultConfig: {
      type: "when_task_completed",
      config: {
        taskActionId: "",
      },
    },
  },
  when_any_task_completed: {
    type: "when_any_task_completed",
    label: "When Any Task Completed",
    icon: CheckCheck,
    description: "Advance when ANY of the selected tasks is completed",
    badgeText: "When any task done",
    defaultConfig: {
      type: "when_any_task_completed",
      config: {
        taskActionIds: [],
      },
    },
  },
  when_all_tasks_completed: {
    type: "when_all_tasks_completed",
    label: "When All Tasks Completed",
    icon: ListChecks,
    description: "Advance when ALL selected tasks are completed",
    badgeText: "When all tasks done",
    defaultConfig: {
      type: "when_all_tasks_completed",
      config: {
        taskActionIds: [],
      },
    },
  },
  when_approved: {
    type: "when_approved",
    label: "When Approved/Rejected",
    icon: CheckCircle,
    description: "Advance when approved or rejected with branching paths",
    badgeText: "When approved",
    defaultConfig: {
      type: "when_approved",
      config: {
        taskActionId: "",
        onApproved: "next",
        onRejected: "end",
      },
    },
  },
  when_form_submitted: {
    type: "when_form_submitted",
    label: "When Form Submitted",
    icon: FileText,
    description: "Advance when an external form is submitted",
    badgeText: "When form submitted",
    defaultConfig: {
      type: "when_form_submitted",
      config: {
        formId: "",
      },
    },
  },
  when_duration_passes: {
    type: "when_duration_passes",
    label: "When Time Passes",
    icon: Timer,
    description: "Advance after a specified duration",
    badgeText: "When time passes",
    defaultConfig: {
      type: "when_duration_passes",
      config: {
        duration: 1,
        unit: "days",
      },
    },
  },
  when_manually_advanced: {
    type: "when_manually_advanced",
    label: "When Manually Advanced",
    icon: Hand,
    description: "Advance when a user manually clicks to continue",
    badgeText: "Manual advance",
    defaultConfig: {
      type: "when_manually_advanced",
      config: {},
    },
  },
  conditional_branches: {
    type: "conditional_branches",
    label: "Conditional Branches",
    icon: GitBranch,
    description: "Branch to different steps based on a variable value",
    badgeText: "Branches",
    defaultConfig: {
      type: "conditional_branches",
      config: {
        field: "",
        branches: [],
        default: "next",
      },
    },
  },
}

export function getConditionMetadata(type: SimpleConditionType): ConditionMetadata {
  return conditionRegistry[type]
}

export function getConditionBadgeText(condition: AdvancementCondition): string {
  if (condition.type === "compound") {
    const operator = condition.operator
    const count = condition.conditions.length
    return `${operator} (${count})`
  }
  return conditionRegistry[condition.type].badgeText
}
