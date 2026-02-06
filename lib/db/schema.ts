/**
 * Drizzle ORM Schema for Byte Dashboard MVP
 *
 * This file defines the database schema for application data.
 * Temporal.io handles workflow execution state separately.
 *
 * Tables:
 * - users: Synced from Clerk
 * - contacts: People/applicants
 * - applications: Application records
 * - tasks: Task management
 * - workflow_templates: UI metadata for workflows (Temporal handles execution)
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
    role: text("role").default("user").notNull(), // owner, admin, user
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgIdx: index("idx_users_org").on(table.orgId),
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
  })
);

// ===========================
// Workflow Templates
// ===========================

export const workflowTemplates = pgTable(
  "workflow_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    statuses: jsonb("statuses").default([]).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgIdx: index("idx_workflow_templates_org").on(table.orgId),
  })
);

// ===========================
// Applications
// ===========================

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id").notNull(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    workflowTemplateId: uuid("workflow_template_id").references(
      () => workflowTemplates.id
    ),
    status: text("status").default("submitted").notNull(),
    source: text("source").default("manual").notNull(), // manual, formstack, etc.
    sourceId: text("source_id"), // external reference ID
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgIdx: index("idx_applications_org").on(table.orgId),
    contactIdx: index("idx_applications_contact").on(table.contactId),
    statusIdx: index("idx_applications_status").on(table.orgId, table.status),
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
    applicationId: uuid("application_id").references(() => applications.id),
    contactId: uuid("contact_id").references(() => contacts.id),
    assignedTo: text("assigned_to").references(() => users.id),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").default("todo").notNull(), // todo, in_progress, done
    priority: text("priority").default("medium").notNull(), // low, medium, high
    position: integer("position").default(0).notNull(),
    dueDate: date("due_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
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
    statusIdx: index("idx_tasks_status").on(table.orgId, table.status),
    applicationIdx: index("idx_tasks_application").on(table.applicationId),
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
    entityType: text("entity_type").notNull(), // 'application', 'contact', 'task'
    entityId: uuid("entity_id").notNull(),
    // Soft FKs for efficient queries (nullable, indexed)
    applicationId: uuid("application_id").references(() => applications.id, {
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
    applicationIdx: index("idx_notes_application").on(table.applicationId),
    contactIdx: index("idx_notes_contact").on(table.contactId),
    taskIdx: index("idx_notes_task").on(table.taskId),
    // Ensure only one FK is set
    oneParentOnly: check(
      "one_parent_only",
      sql`(
        (CASE WHEN ${table.applicationId} IS NOT NULL THEN 1 ELSE 0 END) +
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
    entityType: text("entity_type").notNull(), // 'application', 'contact', 'task'
    entityId: uuid("entity_id").notNull(),
    // Soft FKs for efficient queries (nullable, indexed)
    applicationId: uuid("application_id").references(() => applications.id, {
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
    applicationIdx: index("idx_activity_application").on(table.applicationId),
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
  defaultWorkflowId: uuid("default_workflow_id").references(
    () => workflowTemplates.id
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
    applicationId: uuid("application_id").references(() => applications.id),
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
