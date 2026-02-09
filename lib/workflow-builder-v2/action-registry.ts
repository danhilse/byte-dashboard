// ============================================================================
// Action Registry - Metadata for all action types
// ============================================================================

import type { ActionType, WorkflowAction } from "./types"
import {
  Mail,
  CheckSquare,
  User,
  Flag,
  Edit,
  UserPlus,
  Variable,
  type LucideIcon,
} from "lucide-react"

export interface ActionMetadata {
  type: ActionType
  label: string
  icon: LucideIcon
  description: string
  category: "communication" | "tasks" | "data" | "workflow"
  defaultConfig: WorkflowAction
}

export const actionRegistry: Record<ActionType, ActionMetadata> = {
  send_email: {
    type: "send_email",
    label: "Send Email",
    icon: Mail,
    description: "Send an email to a contact or team member",
    category: "communication",
    defaultConfig: {
      type: "send_email",
      id: "",
      config: {
        to: "{{contact.email}}",
        subject: "",
        body: "",
      },
    },
  },
  create_task: {
    type: "create_task",
    label: "Create Task",
    icon: CheckSquare,
    description: "Create a task assigned to a user or role",
    category: "tasks",
    defaultConfig: {
      type: "create_task",
      id: "",
      config: {
        title: "",
        taskType: "standard",
        assignTo: { type: "role", role: "" },
        priority: "medium",
      },
    },
  },
  update_contact: {
    type: "update_contact",
    label: "Update Contact",
    icon: User,
    description: "Update fields on the workflow's contact",
    category: "data",
    defaultConfig: {
      type: "update_contact",
      id: "",
      config: {
        fields: [],
      },
    },
  },
  update_status: {
    type: "update_status",
    label: "Update Workflow Status",
    icon: Flag,
    description: "Change the workflow's status",
    category: "workflow",
    defaultConfig: {
      type: "update_status",
      id: "",
      config: {
        status: "",
      },
    },
  },
  update_task: {
    type: "update_task",
    label: "Update Task",
    icon: Edit,
    description: "Update a task created earlier in this workflow",
    category: "tasks",
    defaultConfig: {
      type: "update_task",
      id: "",
      config: {
        taskActionId: "",
        fields: [],
      },
    },
  },
  create_contact: {
    type: "create_contact",
    label: "Create Contact",
    icon: UserPlus,
    description: "Create a new related contact (e.g., reference)",
    category: "data",
    defaultConfig: {
      type: "create_contact",
      id: "",
      config: {
        contactType: "reference",
        fields: [],
      },
    },
  },
  set_variable: {
    type: "set_variable",
    label: "Set Variable",
    icon: Variable,
    description: "Set or update a custom variable value",
    category: "data",
    defaultConfig: {
      type: "set_variable",
      id: "",
      config: {
        variableId: "",
        value: "",
      },
    },
  },
}

export const actionCategories = {
  communication: {
    label: "Communication",
    description: "Send emails and notifications",
  },
  tasks: {
    label: "Tasks",
    description: "Create and manage tasks",
  },
  data: {
    label: "Data",
    description: "Update contacts and records",
  },
  workflow: {
    label: "Workflow",
    description: "Control workflow state",
  },
} as const

export function getActionMetadata(type: ActionType): ActionMetadata {
  return actionRegistry[type]
}

export function getActionsByCategory() {
  const categories: Record<string, ActionMetadata[]> = {}

  for (const action of Object.values(actionRegistry)) {
    if (!categories[action.category]) {
      categories[action.category] = []
    }
    categories[action.category].push(action)
  }

  return categories
}
