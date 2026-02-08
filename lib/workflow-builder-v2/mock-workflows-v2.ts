// ============================================================================
// Mock Workflows V2 - Example workflows for testing (Updated)
// ============================================================================

import type { WorkflowDefinitionV2 } from "@/app/builder-test/types/workflow-v2"

export const mockWorkflowsV2: WorkflowDefinitionV2[] = [
  // ============================================================================
  // 1. Simple Approval Workflow
  // ============================================================================
  {
    id: "wf-simple-approval",
    name: "Simple Application Approval",
    description: "Basic workflow with one approval step",
    trigger: { type: "manual" },
    contactRequired: true,
    phases: [
      { id: "phase-1", name: "Review", color: "#3b82f6", order: 0 },
      { id: "phase-2", name: "Decision", color: "#10b981", order: 1 },
    ],
    steps: [
      {
        id: "step-1",
        name: "Submit Application",
        phaseId: "phase-1",
        actions: [
          {
            type: "send_email",
            id: "action-1",
            config: {
              to: "var-contact.email",
              subject: "We received your application",
              body: "Hi there,\n\nThank you for applying. We'll review your application and get back to you soon.",
            },
          },
          {
            type: "create_task",
            id: "action-2",
            config: {
              title: "Review application",
              description: "Review the applicant's materials and make a decision",
              taskType: "approval",
              assignTo: { type: "role", role: "reviewer" },
              priority: "high",
              dueDays: 3,
            },
          },
        ],
        advancementCondition: {
          type: "when_approved",
          config: {
            taskActionId: "action-2",
            onApproved: "next",
            onRejected: "end",
          },
        },
      },
      {
        id: "step-2",
        name: "Approved",
        phaseId: "phase-2",
        actions: [
          {
            type: "send_email",
            id: "action-3",
            config: {
              to: "var-contact.email",
              subject: "Congratulations! You've been approved",
              body: "Hi there,\n\nGreat news! Your application has been approved. Welcome aboard!",
            },
          },
          {
            type: "update_status",
            id: "action-4",
            config: {
              status: "approved",
            },
          },
          {
            type: "create_task",
            id: "action-5",
            config: {
              title: "Schedule onboarding call",
              taskType: "standard",
              assignTo: { type: "role", role: "onboarding_coordinator" },
              priority: "medium",
              dueDays: 5,
            },
          },
        ],
        advancementCondition: {
          type: "automatic",
        },
      },
    ],
    variables: [], // Variables auto-detected from trigger and actions
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ============================================================================
  // 2. Multi-Path Onboarding
  // ============================================================================
  {
    id: "wf-multi-path",
    name: "Multi-Path Onboarding",
    description: "Workflow with conditional branching and rejection path",
    trigger: { type: "manual" },
    contactRequired: true,
    phases: [
      { id: "phase-1", name: "Screening", color: "#3b82f6", order: 0 },
      { id: "phase-2", name: "Background Check", color: "#8b5cf6", order: 1 },
      { id: "phase-3", name: "Final Decision", color: "#10b981", order: 2 },
    ],
    steps: [
      {
        id: "step-1",
        name: "Initial Screening",
        phaseId: "phase-1",
        actions: [
          {
            type: "create_task",
            id: "action-1",
            config: {
              title: "Screen applicant",
              description: "Review basic qualifications and decide if we should proceed",
              taskType: "approval",
              assignTo: { type: "role", role: "hr_screener" },
              priority: "high",
              dueDays: 2,
            },
          },
        ],
        advancementCondition: {
          type: "when_approved",
          config: {
            taskActionId: "action-1",
            onApproved: "next",
            onRejected: { gotoStepId: "step-4" },
          },
        },
      },
      {
        id: "step-2",
        name: "Background Check",
        phaseId: "phase-2",
        actions: [
          {
            type: "create_task",
            id: "action-2",
            config: {
              title: "Review background check",
              description: "Verify background check results and confirm eligibility",
              taskType: "standard",
              assignTo: { type: "role", role: "compliance_officer" },
              priority: "high",
              dueDays: 5,
            },
          },
          {
            type: "send_email",
            id: "action-3",
            config: {
              to: "var-contact.email",
              subject: "Background check in progress",
              body: "Hi there,\n\nYour initial screening was successful. We're now conducting a background check.",
            },
          },
        ],
        advancementCondition: {
          type: "when_task_completed",
          config: {
            taskActionId: "action-2",
          },
        },
      },
      {
        id: "step-3",
        name: "Final Review",
        phaseId: "phase-3",
        actions: [
          {
            type: "create_task",
            id: "action-4",
            config: {
              title: "Final hiring decision",
              description: "Make final hiring decision based on all information",
              taskType: "approval",
              assignTo: { type: "role", role: "hiring_manager" },
              priority: "high",
              dueDays: 3,
            },
          },
        ],
        advancementCondition: {
          type: "when_approved",
          config: {
            taskActionId: "action-4",
            onApproved: { gotoStepId: "step-5" },
            onRejected: { gotoStepId: "step-4" },
          },
        },
      },
      {
        id: "step-4",
        name: "Rejected",
        actions: [
          {
            type: "send_email",
            id: "action-5",
            config: {
              to: "var-contact.email",
              subject: "Application status update",
              body: "Hi there,\n\nThank you for your interest. Unfortunately, we've decided not to move forward at this time.",
            },
          },
          {
            type: "update_status",
            id: "action-6",
            config: {
              status: "rejected",
            },
          },
        ],
        advancementCondition: {
          type: "automatic",
        },
      },
      {
        id: "step-5",
        name: "Approved & Onboarding",
        phaseId: "phase-3",
        actions: [
          {
            type: "send_email",
            id: "action-7",
            config: {
              to: "var-contact.email",
              subject: "Welcome to the team!",
              body: "Hi there,\n\nCongratulations! We're excited to have you join our team.",
            },
          },
          {
            type: "update_contact",
            id: "action-8",
            config: {
              fields: [
                { field: "status", value: "active" },
                { field: "employeeType", value: "full_time" },
              ],
            },
          },
          {
            type: "update_status",
            id: "action-9",
            config: {
              status: "approved",
            },
          },
        ],
        advancementCondition: {
          type: "automatic",
        },
      },
    ],
    variables: [], // Variables auto-detected from trigger and actions
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ============================================================================
  // 3. Reference Collection (with compound condition example)
  // ============================================================================
  {
    id: "wf-reference-collection",
    name: "Reference Collection",
    description: "Collect and review references - demonstrates compound conditions",
    trigger: { type: "manual" },
    contactRequired: true,
    phases: [
      { id: "phase-1", name: "Collection", color: "#3b82f6", order: 0 },
      { id: "phase-2", name: "Review", color: "#8b5cf6", order: 1 },
    ],
    steps: [
      {
        id: "step-1",
        name: "Request References",
        phaseId: "phase-1",
        actions: [
          {
            type: "create_contact",
            id: "action-1",
            config: {
              contactType: "reference",
              fields: [
                { field: "firstName", value: "Reference" },
                { field: "lastName", value: "1" },
                { field: "email", value: "" },
              ],
            },
          },
          {
            type: "create_contact",
            id: "action-2",
            config: {
              contactType: "reference",
              fields: [
                { field: "firstName", value: "Reference" },
                { field: "lastName", value: "2" },
                { field: "email", value: "" },
              ],
            },
          },
          {
            type: "send_email",
            id: "action-3",
            config: {
              to: "var-contact.email",
              subject: "Please provide your references",
              body: "Hi there,\n\nPlease provide contact information for 2 professional references.",
            },
          },
        ],
        advancementCondition: {
          type: "automatic",
        },
      },
      {
        id: "step-2",
        name: "Wait for References",
        phaseId: "phase-1",
        actions: [
          {
            type: "create_task",
            id: "action-4",
            config: {
              title: "Track reference submissions",
              description: "Ensure both references have been received",
              taskType: "standard",
              assignTo: { type: "role", role: "hr_coordinator" },
              priority: "medium",
              dueDays: 7,
            },
          },
        ],
        // Compound condition: advance when task is done OR after 7 days
        advancementCondition: {
          type: "compound",
          operator: "OR",
          conditions: [
            {
              type: "when_task_completed",
              config: {
                taskActionId: "action-4",
              },
            },
            {
              type: "when_duration_passes",
              config: {
                duration: 7,
                unit: "days",
              },
            },
          ],
        },
      },
      {
        id: "step-3",
        name: "Review References",
        phaseId: "phase-2",
        actions: [
          {
            type: "create_task",
            id: "action-5",
            config: {
              title: "Review references",
              description: "Contact references and evaluate feedback",
              taskType: "approval",
              assignTo: { type: "role", role: "hiring_manager" },
              priority: "high",
              dueDays: 3,
            },
          },
        ],
        advancementCondition: {
          type: "when_approved",
          config: {
            taskActionId: "action-5",
            onApproved: "next",
            onRejected: "end",
          },
        },
      },
      {
        id: "step-4",
        name: "Complete",
        phaseId: "phase-2",
        actions: [
          {
            type: "send_email",
            id: "action-6",
            config: {
              to: "var-contact.email",
              subject: "Reference check complete",
              body: "Hi there,\n\nThank you for providing your references. We've completed our review.",
            },
          },
          {
            type: "update_status",
            id: "action-7",
            config: {
              status: "references_complete",
            },
          },
        ],
        advancementCondition: {
          type: "automatic",
        },
      },
    ],
    variables: [], // Variables auto-detected from trigger and actions
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]
