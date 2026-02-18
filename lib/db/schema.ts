/**
 * Drizzle ORM Schema for Byte Dashboard MVP
 *
 * This file defines the database schema for dashboard data.
 * Temporal.io handles workflow execution state separately.
 *
 * Tables:
 * - users: Synced from Clerk
 * - contacts: People/applicants
 * - workflow_definitions: Workflow blueprints (steps, phases, variables)
 * - workflow_executions: Workflow execution instances
 * - tasks: Task management
 * - notifications: In-app user notifications
 * - notes: Notes on any entity (polymorphic with soft FKs)
 * - activity_log: Audit trail (polymorphic with soft FKs)
 * - formstack_config: Formstack integration settings
 * - formstack_submissions: Raw webhook payloads
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  date,
  integer,
  index,
  primaryKey,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ===========================
// Users (Clerk Sync)
// ===========================

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(), // Clerk user ID
    orgId: text("org_id").notNull(), // LEGACY: kept for backward compatibility
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    role: text("role").default("user").notNull(), // LEGACY: use organizationMemberships.role
    roles: text("roles").array().default(sql`'{}'`).notNull(), // LEGACY: use organizationMemberships.roles
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgIdx: index("idx_users_org").on(table.orgId),
    rolesIdx: index("idx_users_roles").using("gin", table.roles),
  })
);

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    orgId: text("org_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    clerkRole: text("clerk_role"),
    role: text("role").default("member").notNull(),
    roles: text("roles").array().default(sql`'{}'`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.userId] }),
    orgIdx: index("idx_organization_memberships_org").on(table.orgId),
    userIdx: index("idx_organization_memberships_user").on(table.userId),
    rolesIdx: index("idx_organization_memberships_roles").using("gin", table.roles),
  })
);

// ===========================
// Contacts
// ===========================

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    role: text("role"),
    status: text("status").default("active").notNull(), // active, inactive, lead
    avatarUrl: text("avatar_url"),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
    addressLine1: text("address_line_1"),
    addressLine2: text("address_line_2"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    metadata: jsonb("metadata").default({}).notNull(),
    tags: text("tags").array().default(sql`'{}'`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgIdx: index("idx_contacts_org").on(table.orgId),
    emailIdx: index("idx_contacts_email").on(table.email),
    nameIdx: index("idx_contacts_name").on(table.lastName, table.firstName),
    statusIdx: index("idx_contacts_status").on(table.orgId, table.status),
  })
);

// ===========================
// Workflow Definitions (Blueprints)
// ===========================

export const workflowDefinitions = pgTable(
  "workflow_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    version: integer("version").default(1).notNull(), // Immutable versioning (edit = clone + increment)
    phases: jsonb("phases").default([]).notNull(), // Array of phase definitions
    steps: jsonb("steps").default([]).notNull(), // Array of step definitions
    variables: jsonb("variables").default({}).notNull(), // Variable definitions
    statuses: jsonb("statuses").default([]).notNull(), // UI status definitions
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgIdx: index("idx_workflow_definitions_org").on(table.orgId),
    activeIdx: index("idx_workflow_definitions_active").on(
      table.orgId,
      table.isActive
    ),
  })
);

// ===========================
// Workflow Executions
// ===========================

export const workflowExecutions = pgTable(
  "workflow_executions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id").notNull(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    workflowDefinitionId: uuid("workflow_definition_id").references(
      () => workflowDefinitions.id
    ),
    definitionVersion: integer("definition_version"), // Snapshot of definition version at execution time
    currentStepId: text("current_step_id"), // Which step is currently executing
    currentPhaseId: text("current_phase_id"), // Legacy optional step-grouping pointer
    status: text("status").default("running").notNull(), // Business status
    workflowExecutionState: text("workflow_execution_state")
      .default("running")
      .notNull(), // Internal runtime state: running/completed/error/timeout/cancelled
    errorDefinition: text("error_definition"), // Last runtime error detail (if any)
    updatedByTemporal: boolean("updated_by_temporal").default(false).notNull(), // Flag to prevent race conditions
    source: text("source").default("manual").notNull(), // manual, formstack, api
    sourceId: text("source_id"), // external reference ID
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    temporalWorkflowId: text("temporal_workflow_id"), // Temporal workflow execution ID
    temporalRunId: text("temporal_run_id"), // Temporal run ID
    variables: jsonb("variables").default(sql`'{}'::jsonb`).notNull(), // Runtime variables
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgIdx: index("idx_workflow_executions_org").on(table.orgId),
    contactIdx: index("idx_workflow_executions_contact").on(table.contactId),
    statusIdx: index("idx_workflow_executions_status").on(table.orgId, table.status),
    stateIdx: index("idx_workflow_executions_state").on(
      table.orgId,
      table.workflowExecutionState
    ),
    definitionIdx: index("idx_workflow_executions_definition").on(
      table.workflowDefinitionId
    ),
    temporalIdx: index("idx_workflow_executions_temporal").on(table.temporalWorkflowId),
  })
);

// ===========================
// Tasks
// ===========================

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id").notNull(),
    workflowExecutionId: uuid("workflow_execution_id").references(() => workflowExecutions.id),
    contactId: uuid("contact_id").references(() => contacts.id),
    assignedTo: text("assigned_to").references(() => users.id), // Specific user if claimed
    assignedRole: text("assigned_role"), // Role if role-based assignment
    title: text("title").notNull(),
    description: text("description"),
    taskType: text("task_type").default("standard").notNull(), // standard, approval
    status: text("status").default("todo").notNull(), // todo, in_progress, done
    priority: text("priority").default("medium").notNull(), // low, medium, high
    outcome: text("outcome"), // approved, rejected, completed, etc.
    outcomeComment: text("outcome_comment"), // Comment from approver
    position: integer("position").default(0).notNull(), // For drag-and-drop ordering
    dueDate: date("due_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdByStepId: text("created_by_step_id"), // Which workflow step created this task
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgIdx: index("idx_tasks_org").on(table.orgId),
    assignedIdx: index("idx_tasks_assigned").on(table.assignedTo),
    roleIdx: index("idx_tasks_role").on(table.assignedRole),
    statusIdx: index("idx_tasks_status").on(table.orgId, table.status),
    workflowIdx: index("idx_tasks_workflow_execution").on(table.workflowExecutionId),
    positionIdx: index("idx_tasks_position").on(
      table.orgId,
      table.status,
      table.position
    ),
  })
);

// ===========================
// Notifications
// ===========================

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    type: text("type").default("info").notNull(), // task_assigned, workflow_notification, etc.
    title: text("title").notNull(),
    message: text("message").notNull(),
    entityType: text("entity_type"), // task, workflow_execution, etc.
    entityId: text("entity_id"),
    isRead: boolean("is_read").default(false).notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgUserIdx: index("idx_notifications_org_user").on(table.orgId, table.userId),
    unreadIdx: index("idx_notifications_unread").on(table.orgId, table.userId, table.isRead),
    createdIdx: index("idx_notifications_created").on(table.userId, table.createdAt),
  })
);

// ===========================
// Notes
// ===========================

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id").notNull(),
    entityType: text("entity_type").notNull(), // 'workflow', 'contact', 'task'
    entityId: uuid("entity_id").notNull(),
    // Soft FKs for efficient queries (nullable, indexed)
    workflowExecutionId: uuid("workflow_execution_id").references(() => workflowExecutions.id, {
      onDelete: "cascade",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "cascade",
    }),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    isInternal: boolean("is_internal").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    entityIdx: index("idx_notes_entity").on(table.entityType, table.entityId),
    orgIdx: index("idx_notes_org").on(table.orgId),
    workflowIdx: index("idx_notes_workflow_execution").on(table.workflowExecutionId),
    contactIdx: index("idx_notes_contact").on(table.contactId),
    taskIdx: index("idx_notes_task").on(table.taskId),
    // Ensure only one FK is set
    oneParentOnly: check(
      "one_parent_only",
      sql`(
        (CASE WHEN ${table.workflowExecutionId} IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN ${table.contactId} IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN ${table.taskId} IS NOT NULL THEN 1 ELSE 0 END)
      ) = 1`
    ),
  })
);

// ===========================
// Activity Log
// ===========================

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id").notNull(),
    userId: text("user_id").references(() => users.id),
    entityType: text("entity_type").notNull(), // 'workflow', 'contact', 'task'
    entityId: uuid("entity_id").notNull(),
    // Soft FKs for efficient queries (nullable, indexed)
    workflowExecutionId: uuid("workflow_execution_id").references(() => workflowExecutions.id, {
      onDelete: "cascade",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "cascade",
    }),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "cascade",
    }),
    action: text("action").notNull(), // 'created', 'updated', 'deleted', 'status_changed'
    details: jsonb("details").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgIdx: index("idx_activity_org").on(table.orgId),
    entityIdx: index("idx_activity_entity").on(table.entityType, table.entityId),
    timeIdx: index("idx_activity_time").on(table.createdAt),
    workflowIdx: index("idx_activity_workflow_execution").on(table.workflowExecutionId),
    contactIdx: index("idx_activity_contact").on(table.contactId),
    taskIdx: index("idx_activity_task").on(table.taskId),
  })
);

// ===========================
// Formstack Config
// ===========================

export const formstackConfig = pgTable("formstack_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: text("org_id").notNull().unique(),
  webhookSecret: text("webhook_secret"),
  fieldMappings: jsonb("field_mappings").default({}).notNull(),
  defaultWorkflowDefinitionId: uuid("default_workflow_definition_id").references(
    () => workflowDefinitions.id
  ),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ===========================
// Formstack Submissions
// ===========================

export const formstackSubmissions = pgTable(
  "formstack_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id").notNull(),
    formId: text("form_id").notNull(),
    submissionId: text("submission_id").notNull(),
    rawPayload: jsonb("raw_payload").notNull(),
    processed: boolean("processed").default(false).notNull(),
    workflowExecutionId: uuid("workflow_execution_id").references(() => workflowExecutions.id),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgIdx: index("idx_formstack_org").on(table.orgId),
    processedIdx: index("idx_formstack_processed").on(table.processed),
    // Prevent duplicate webhook processing
    uniqueSubmission: uniqueIndex("unique_formstack_submission").on(
      table.orgId,
      table.submissionId
    ),
  })
);
