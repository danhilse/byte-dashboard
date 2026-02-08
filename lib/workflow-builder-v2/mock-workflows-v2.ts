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

  // ============================================================================
  // 4. Sheriff Application Workflow (Real-world complex example)
  // ============================================================================
  {
    id: "wf-sheriff-application",
    name: "Sheriff Application Workflow",
    description:
      "Full 10-step sheriff deputy application process with background checks, interviews, medical/psych evaluations, and approval",
    trigger: { type: "manual" }, // Later: form_submission when form integration is ready
    contactRequired: true,
    phases: [],
    steps: [
      // ========================================================================
      // Step 1: Review Application for Completeness
      // Status: pending (application just submitted)
      // ========================================================================
      {
        id: "step-1",
        name: "Review Application for Completeness",
        actions: [
          {
            type: "update_status",
            id: "action-1-1",
            config: {
              status: "pending",
            },
          },
          {
            type: "send_email",
            id: "action-1-2",
            config: {
              to: "var-contact.email",
              subject: "Application Received - FCSO Deputy Position",
              body: "Dear var-contact.firstName var-contact.lastName,\n\nThank you for applying for the Deputy Sheriff position with the Flagler County Sheriff's Office. We have received your application and will begin the review process.\n\nYou will receive updates as your application progresses through our hiring process.\n\nBest regards,\nFCSO Human Resources",
            },
          },
          {
            type: "create_task",
            id: "action-1-3",
            config: {
              title: "Review application for completeness - var-contact.firstName var-contact.lastName",
              description:
                "Review the applicant's submitted form to ensure all required fields are completed and documentation is provided. Verify eligibility requirements are met.",
              taskType: "standard",
              assignTo: { type: "role", role: "hr_coordinator" },
              priority: "high",
              dueDays: 2,
            },
          },
        ],
        advancementCondition: {
          type: "when_task_completed",
          config: {
            taskActionId: "action-1-3",
          },
        },
      },

      // ========================================================================
      // Step 2: Testing, Exemptions, and Pre-Employment Questionnaire
      // Status: in_review
      // ========================================================================
      {
        id: "step-2",
        name: "Testing, Exemptions, and Pre-Employment Questionnaire",
        actions: [
          {
            type: "update_status",
            id: "action-2-1",
            config: {
              status: "in_review",
            },
          },
          {
            type: "send_email",
            id: "action-2-2",
            config: {
              to: "var-contact.email",
              subject: "Next Steps: Testing & Questionnaire",
              body: "Dear var-contact.firstName,\n\nYour application has been reviewed and accepted for further processing. The next steps include:\n\n- Required testing\n- Review of any exemptions\n- Pre-employment questionnaire completion\n\nOur HR team will contact you to schedule these items.\n\nBest regards,\nFCSO Human Resources",
            },
          },
          {
            type: "create_task",
            id: "action-2-3",
            config: {
              title: "Administer testing and pre-employment questionnaire - var-contact.firstName var-contact.lastName",
              description:
                "Coordinate required testing, review any exemption requests, and ensure pre-employment questionnaire is completed by the applicant.",
              taskType: "standard",
              assignTo: { type: "role", role: "hr_coordinator" },
              priority: "high",
              dueDays: 5,
            },
          },
        ],
        advancementCondition: {
          type: "when_task_completed",
          config: {
            taskActionId: "action-2-3",
          },
        },
      },

      // ========================================================================
      // Step 3: Background Investigations
      // Status: background_check
      // ========================================================================
      {
        id: "step-3",
        name: "Background Investigations",
        actions: [
          {
            type: "update_status",
            id: "action-3-1",
            config: {
              status: "background_check",
            },
          },
          {
            type: "send_email",
            id: "action-3-2",
            config: {
              to: "var-contact.email",
              subject: "Background Investigation Initiated",
              body: "Dear var-contact.firstName,\n\nWe are now initiating the background investigation phase of your application. This process includes:\n\n- Criminal history review\n- Employment verification\n- Education verification\n- Reference checks\n\nThis phase may take several weeks. We appreciate your patience during this thorough process.\n\nBest regards,\nFCSO Background Investigation Unit",
            },
          },
          {
            type: "create_task",
            id: "action-3-3",
            config: {
              title: "Conduct background investigation - var-contact.firstName var-contact.lastName",
              description:
                "Perform comprehensive background investigation including criminal history, employment verification, education verification, and reference checks.",
              taskType: "standard",
              assignTo: { type: "role", role: "background_investigator" },
              priority: "high",
              dueDays: 14,
            },
          },
        ],
        advancementCondition: {
          type: "when_task_completed",
          config: {
            taskActionId: "action-3-3",
          },
        },
      },

      // ========================================================================
      // Step 4: Background Interview
      // Status: background_check (continues)
      // ========================================================================
      {
        id: "step-4",
        name: "Background Interview",
        actions: [
          {
            type: "send_email",
            id: "action-4-1",
            config: {
              to: "var-contact.email",
              subject: "Background Interview Scheduled",
              body: "Dear var-contact.firstName,\n\nYour background investigation is progressing well. We would like to schedule a background interview with you to discuss your application and background in detail.\n\nOur background investigator will contact you shortly to arrange a convenient time.\n\nBest regards,\nFCSO Background Investigation Unit",
            },
          },
          {
            type: "create_task",
            id: "action-4-2",
            config: {
              title: "Background interview - var-contact.firstName var-contact.lastName",
              description:
                "Conduct in-depth background interview with the applicant to verify information and assess suitability for law enforcement position.",
              taskType: "standard",
              assignTo: { type: "role", role: "background_investigator" },
              priority: "high",
              dueDays: 7,
            },
          },
        ],
        advancementCondition: {
          type: "when_task_completed",
          config: {
            taskActionId: "action-4-2",
          },
        },
      },

      // ========================================================================
      // Step 5: Computer Voice Stress Analysis Exam (CVSA)
      // Status: background_check (continues)
      // ========================================================================
      {
        id: "step-5",
        name: "Computer Voice Stress Analysis Exam (CVSA)",
        actions: [
          {
            type: "send_email",
            id: "action-5-1",
            config: {
              to: "var-contact.email",
              subject: "CVSA Examination Scheduled",
              body: "Dear var-contact.firstName,\n\nThe next step in your application process is the Computer Voice Stress Analysis (CVSA) examination. This is a standard part of our screening process for all deputy positions.\n\nPlease arrive well-rested and prepared to answer questions honestly. Our examiner will contact you to schedule your appointment.\n\nBest regards,\nFCSO Human Resources",
            },
          },
          {
            type: "create_task",
            id: "action-5-2",
            config: {
              title: "Administer CVSA exam - var-contact.firstName var-contact.lastName",
              description:
                "Schedule and administer Computer Voice Stress Analysis examination. Review results and determine if applicant passes.",
              taskType: "standard",
              assignTo: { type: "role", role: "cvsa_examiner" },
              priority: "high",
              dueDays: 7,
            },
          },
        ],
        advancementCondition: {
          type: "when_task_completed",
          config: {
            taskActionId: "action-5-2",
          },
        },
      },

      // ========================================================================
      // Step 6: Division Director Review/Interview
      // Status: interview
      // ========================================================================
      {
        id: "step-6",
        name: "Division Director Review/Interview",
        actions: [
          {
            type: "update_status",
            id: "action-6-1",
            config: {
              status: "interview",
            },
          },
          {
            type: "send_email",
            id: "action-6-2",
            config: {
              to: "var-contact.email",
              subject: "Division Director Interview Scheduled",
              body: "Dear var-contact.firstName,\n\nCongratulations on progressing to the Division Director interview stage! This is an important step in our hiring process.\n\nThe Division Director will review your entire application package and conduct an in-person interview to assess your qualifications and fit for the position.\n\nBest regards,\nFCSO Human Resources",
            },
          },
          {
            type: "create_task",
            id: "action-6-3",
            config: {
              title: "Division Director interview - var-contact.firstName var-contact.lastName",
              description:
                "Review complete application package and conduct interview with applicant. Make preliminary recommendation regarding hiring.",
              taskType: "approval",
              assignTo: { type: "role", role: "division_director" },
              priority: "high",
              dueDays: 7,
            },
          },
        ],
        advancementCondition: {
          type: "when_approved",
          config: {
            taskActionId: "action-6-3",
            onApproved: "next",
            onRejected: { gotoStepId: "step-rejected" },
          },
        },
      },

      // ========================================================================
      // Step 7: Psychological Evaluation
      // Status: final_review
      // ========================================================================
      {
        id: "step-7",
        name: "Psychological Evaluation",
        actions: [
          {
            type: "update_status",
            id: "action-7-1",
            config: {
              status: "final_review",
            },
          },
          {
            type: "send_email",
            id: "action-7-2",
            config: {
              to: "var-contact.email",
              subject: "Psychological Evaluation Scheduled",
              body: "Dear var-contact.firstName,\n\nYou have been approved to move forward to the final review stages. The next step is a psychological evaluation with our licensed psychologist.\n\nThis evaluation is a standard requirement for all law enforcement positions. Our HR team will contact you to schedule your appointment.\n\nBest regards,\nFCSO Human Resources",
            },
          },
          {
            type: "create_task",
            id: "action-7-3",
            config: {
              title: "Psychological evaluation - var-contact.firstName var-contact.lastName",
              description:
                "Schedule psychological evaluation with licensed psychologist. Review results and confirm psychological suitability for law enforcement position.",
              taskType: "standard",
              assignTo: { type: "role", role: "hr_coordinator" },
              priority: "high",
              dueDays: 10,
            },
          },
        ],
        advancementCondition: {
          type: "when_task_completed",
          config: {
            taskActionId: "action-7-3",
          },
        },
      },

      // ========================================================================
      // Step 8: Medical Sports Physical
      // Status: final_review (continues)
      // ========================================================================
      {
        id: "step-8",
        name: "Medical Sports Physical",
        actions: [
          {
            type: "send_email",
            id: "action-8-1",
            config: {
              to: "var-contact.email",
              subject: "Medical Physical Scheduled",
              body: "Dear var-contact.firstName,\n\nYou are required to complete a comprehensive medical sports physical. This evaluation ensures you meet the physical requirements for the Deputy Sheriff position.\n\nPlease bring any relevant medical records to your appointment. Our HR team will provide you with scheduling information.\n\nBest regards,\nFCSO Human Resources",
            },
          },
          {
            type: "create_task",
            id: "action-8-2",
            config: {
              title: "Medical sports physical - var-contact.firstName var-contact.lastName",
              description:
                "Schedule medical sports physical with approved physician. Review results and confirm physical fitness for law enforcement duties.",
              taskType: "standard",
              assignTo: { type: "role", role: "hr_coordinator" },
              priority: "high",
              dueDays: 10,
            },
          },
        ],
        advancementCondition: {
          type: "when_task_completed",
          config: {
            taskActionId: "action-8-2",
          },
        },
      },

      // ========================================================================
      // Step 9: Background Investigation Conclusion
      // Status: final_review (continues)
      // ========================================================================
      {
        id: "step-9",
        name: "Background Investigation Conclusion",
        actions: [
          {
            type: "create_task",
            id: "action-9-1",
            config: {
              title: "Complete background investigation - var-contact.firstName var-contact.lastName",
              description:
                "Finalize all background investigation components. Review all findings, psychological evaluation results, and medical physical results. Prepare comprehensive recommendation report.",
              taskType: "standard",
              assignTo: { type: "role", role: "background_investigator" },
              priority: "high",
              dueDays: 5,
            },
          },
        ],
        advancementCondition: {
          type: "when_task_completed",
          config: {
            taskActionId: "action-9-1",
          },
        },
      },

      // ========================================================================
      // Step 10: Drug Screening & Final Decision
      // Status: complete
      // ========================================================================
      {
        id: "step-10",
        name: "Drug Screening & Final Decision",
        actions: [
          {
            type: "update_status",
            id: "action-10-1",
            config: {
              status: "complete",
            },
          },
          {
            type: "send_email",
            id: "action-10-2",
            config: {
              to: "var-contact.email",
              subject: "Final Step: Drug Screening",
              body: "Dear var-contact.firstName,\n\nCongratulations on reaching the final step of the application process! You are required to complete a drug screening before a final hiring decision can be made.\n\nPlease report to the designated testing facility within 24 hours of receiving this notification. Instructions will be provided separately.\n\nBest regards,\nFCSO Human Resources",
            },
          },
          {
            type: "create_task",
            id: "action-10-3",
            config: {
              title: "Drug screening and final decision - var-contact.firstName var-contact.lastName",
              description:
                "Verify drug screening results. Review complete application package including all evaluations and investigations. Make final hiring decision.\n\nIf rejected, select appropriate denial reason from 21 categories.",
              taskType: "approval",
              assignTo: { type: "role", role: "chief_deputy" },
              priority: "high",
              dueDays: 3,
            },
          },
        ],
        advancementCondition: {
          type: "when_approved",
          config: {
            taskActionId: "action-10-3",
            onApproved: { gotoStepId: "step-approved" },
            onRejected: { gotoStepId: "step-rejected" },
          },
        },
      },

      // ========================================================================
      // APPROVED PATH
      // Status: approved
      // ========================================================================
      {
        id: "step-approved",
        name: "Application Approved - Welcome Aboard",
        actions: [
          {
            type: "update_status",
            id: "action-approved-1",
            config: {
              status: "approved",
            },
          },
          {
            type: "send_email",
            id: "action-approved-2",
            config: {
              to: "var-contact.email",
              subject: "Congratulations - Conditional Offer of Employment",
              body: "Dear var-contact.firstName var-contact.lastName,\n\nCongratulations! On behalf of Sheriff Rick Staly and the entire Flagler County Sheriff's Office, we are pleased to extend a conditional offer of employment for the position of Deputy Sheriff.\n\nYou have successfully completed all stages of our rigorous hiring process and demonstrated the qualities we seek in our deputies. We are excited to welcome you to the FCSO family.\n\nOur HR team will contact you within 48 hours to discuss next steps including:\n\n- Start date\n- Onboarding schedule\n- Academy enrollment (if applicable)\n- Uniform and equipment\n- Benefits enrollment\n\nWelcome to the team!\n\nBest regards,\nFlagler County Sheriff's Office\nHuman Resources Division",
            },
          },
          {
            type: "update_contact",
            id: "action-approved-3",
            config: {
              fields: [
                { field: "status", value: "hired" },
                { field: "employeeType", value: "deputy_sheriff" },
              ],
            },
          },
          {
            type: "create_task",
            id: "action-approved-4",
            config: {
              title: "Onboarding and academy enrollment - var-contact.firstName var-contact.lastName",
              description:
                "Coordinate onboarding process, schedule start date, arrange academy enrollment if needed, and complete all pre-employment paperwork.",
              taskType: "standard",
              assignTo: { type: "role", role: "hr_coordinator" },
              priority: "high",
              dueDays: 7,
            },
          },
        ],
        advancementCondition: {
          type: "automatic",
        },
      },

      // ========================================================================
      // REJECTED PATH
      // Status: rejected
      // Note: Denial reasons (21 categories) are captured in the approval task
      // when the reviewer rejects. This is task metadata, not workflow config.
      // ========================================================================
      {
        id: "step-rejected",
        name: "Application Not Selected",
        actions: [
          {
            type: "update_status",
            id: "action-rejected-1",
            config: {
              status: "rejected",
            },
          },
          {
            type: "send_email",
            id: "action-rejected-2",
            config: {
              to: "var-contact.email",
              subject: "Application Status Update - FCSO Deputy Position",
              body: "Dear var-contact.firstName var-contact.lastName,\n\nThank you for your interest in the Deputy Sheriff position with the Flagler County Sheriff's Office and for the time you invested in our application process.\n\nAfter careful consideration of your qualifications and completion of our screening process, we have decided not to move forward with your application at this time.\n\nWe encourage you to continue pursuing your career goals in law enforcement and wish you success in your future endeavors.\n\nIf you have questions regarding this decision, you may contact our Human Resources division.\n\nBest regards,\nFlagler County Sheriff's Office\nHuman Resources Division",
            },
          },
          {
            type: "update_contact",
            id: "action-rejected-3",
            config: {
              fields: [{ field: "status", value: "not_selected" }],
            },
          },
        ],
        advancementCondition: {
          type: "automatic",
        },
      },
    ],
    variables: [
      {
        id: "custom-var-1",
        name: "hr_email",
        type: "custom",
        dataType: "email",
        source: {
          type: "custom",
          value: "hr@flaglersheriff.com",
        },
        readOnly: false,
      },
      {
        id: "custom-var-2",
        name: "background_unit_email",
        type: "custom",
        dataType: "email",
        source: {
          type: "custom",
          value: "background@flaglersheriff.com",
        },
        readOnly: false,
      },
      {
        id: "custom-var-3",
        name: "review_deadline_days",
        type: "custom",
        dataType: "number",
        source: {
          type: "custom",
          value: "90",
        },
        readOnly: false,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]
