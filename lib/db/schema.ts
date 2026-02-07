/**
 * Drizzle ORM Schema for Byte Dashboard MVP
 *
 * This file defines the database schema for application data.
 * Temporal.io handles workflow execution state separately.
 *
 * Tables:
 * - users: Synced from Clerk
 * - contacts: People/applicants
 * - workflow_definitions: Workflow blueprints (steps, phases, variables)
 * - workflows: Workflow executions (instances of definitions)
 * - tasks: Task management
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
    orgId: text("org_id").notNull(), // Clerk org ID
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    role: text("role").default("user").notNull(), // DEPRECATED: use roles array
    roles: text("roles").array().default(sql`'{}'`).notNull(), // NEW: Array of roles
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
    steps: jsonb("steps").default({ steps: [] }).notNull(), // Array of step definitions
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
// Workflows (Executions/Instances)
// ===========================

export const workflows = pgTable(
  "workflows",
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
    currentPhaseId: text("current_phase_id"), // Track current phase for UI
    status: text("status").default("running").notNull(), // Presentation-only (Temporal is authoritative)
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
    orgIdx: index("idx_workflows_org").on(table.orgId),
    contactIdx: index("idx_workflows_contact").on(table.contactId),
    statusIdx: index("idx_workflows_status").on(table.orgId, table.status),
    definitionIdx: index("idx_workflows_definition").on(
      table.workflowDefinitionId
    ),
    temporalIdx: index("idx_workflows_temporal").on(table.temporalWorkflowId),
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
    workflowId: uuid("workflow_id").references(() => workflows.id),
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
    workflowIdx: index("idx_tasks_workflow").on(table.workflowId),
    positionIdx: index("idx_tasks_position").on(
      table.orgId,
      table.status,
      table.position
    ),
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
    workflowId: uuid("workflow_id").references(() => workflows.id, {
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
    workflowIdx: index("idx_notes_workflow").on(table.workflowId),
    contactIdx: index("idx_notes_contact").on(table.contactId),
    taskIdx: index("idx_notes_task").on(table.taskId),
    // Ensure only one FK is set
    oneParentOnly: check(
      "one_parent_only",
      sql`(
        (CASE WHEN ${table.workflowId} IS NOT NULL THEN 1 ELSE 0 END) +
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
    workflowId: uuid("workflow_id").references(() => workflows.id, {
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
    workflowIdx: index("idx_activity_workflow").on(table.workflowId),
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
    workflowId: uuid("workflow_id").references(() => workflows.id),
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
