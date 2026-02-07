# Schema Breakdown: BYTE Dashboard

**Date:** February 2026
**Purpose:** Document current schema complexity vs MVP requirements

---

## Executive Summary

| Metric | Current | MVP Target |
|--------|---------|------------|
| Tables | ~65 | 10-15 |
| Functions | ~40 | 5-10 |
| Migrations | 325 | Fresh start |

---

## Current Schema (Full Inventory)

### Core Entities (6 tables)

| Table | Columns | Purpose | MVP? |
|-------|---------|---------|------|
| `tenants` | id, name, domain, logo_url, settings, created_at | Multi-tenant orgs | Yes (via Clerk) |
| `profiles` | user_id, tenant_id, first_name, last_name, email, role, badge_number, avatar_url | User profiles | Yes (simplified) |
| `contacts` | id, tenant_id, first_name, last_name, email, phone, address fields, created_at | People tracked in workflows | Yes |
| `workflow_definitions` | id, tenant_id, name, description, steps (JSONB), is_active, created_at | Workflow blueprints | Yes |
| `workflow_executions` | id, tenant_id, workflow_definition_id, contact_id, status, variables (JSONB), created_at | Workflow instances/runs | Yes |
| `tasks` | id, tenant_id, workflow_execution_id, assigned_to, title, description, status, due_date | Task management | Yes |

---

### Contacts & People (6 tables)

| Table | Purpose | MVP? |
|-------|---------|------|
| `contacts` | Main contact records | Yes |
| `contact_addresses` | Junction to addresses table | No - flatten into contacts |
| `contact_custom_fields` | Custom field values per contact | No - use JSONB metadata |
| `contact_files` | File attachments | No - Phase 2 |
| `contact_sync_mappings` | External system ID mappings | No - Phase 2 |
| `contact_tags` | Tag assignments (junction) | No - use JSONB array |
| `addresses` | Normalized address records | No - flatten into contacts |
| `tags` | Tag definitions | No - simple JSONB |

---

### Workflow Executions (6 tables in old schema)

| Table | Purpose | MVP? |
|-------|---------|------|
| `applications` | Renamed to `workflow_executions` | Yes |
| `application_notes` | Notes on executions | Yes - merge into `notes` |
| `application_snapshots` | Point-in-time snapshots | No - Phase 2 |
| `application_task_status` | Task status tracking | No - redundant with tasks |
| `application_workflow_snapshots` | Execution state history | No - Temporal handles this |
| `application_ingestions` | Raw webhook payloads | Yes - `formstack_submissions` |

---

### Workflow Definitions (16 tables in old schema)

| Table | Purpose | MVP? |
|-------|---------|------|
| `workflows` | Renamed to `workflow_definitions` | Yes (simplified) |
| `workflow_instances` | Renamed to `workflow_executions` | Yes (separate table) |
| `workflow_instance_tasks` | Tasks within instances | No - use tasks table |
| `workflow_steps` | Steps in a workflow | Yes - JSONB `steps` column |
| `workflow_tasks` | Task templates | No - defined in steps |
| `workflow_task_dependencies` | Task ordering | No - defined in steps |
| `workflow_task_fields` | Fields on tasks | No - defined in steps |
| `workflow_task_triggers` | Automation triggers | No - defined in steps |
| `workflow_trigger_executions` | Trigger logs | No - Temporal handles |
| `workflow_statuses` | Status definitions | No - derived from execution state |
| `workflow_status_templates` | Status presets | No |
| `workflow_fields` | Fields in workflows | Yes - `variables` JSONB |
| `workflow_builder_documents` | Visual builder JSON | Yes - `steps` JSONB |
| `workflow_builder_revisions` | Builder history | No - Phase 2 |
| `stages` | Pipeline stages | No - redundant |

**Note:** The old visual workflow builder used 16 tables. MVP replaces this with a single `workflow_definitions` table using a `steps` JSONB column for the linear workflow builder.

---

### Custom Fields System (3 tables)

| Table | Purpose | MVP? |
|-------|---------|------|
| `custom_fields` | Field definitions | No - Phase 2 |
| `custom_field_groups` | Field groupings | No |
| `custom_field_subgroups` | Nested groups | No |

**Note:** MVP uses JSONB `metadata` columns instead of a normalized custom fields system.

---

### Forms & Integrations (7 tables)

| Table | Purpose | MVP? |
|-------|---------|------|
| `form_templates` | Form definitions | No - Phase 2 |
| `form_submissions` | Submitted forms | No - use application_ingestions |
| `form_submission_snapshots` | Submission history | No |
| `form_integrations` | Formstack configs | Yes (simplified) |
| `integrations_sitestacker` | Site Stacker sync | No - not MVP |
| `integration_sync_logs` | Sync history | No |
| `tenant_integrations` | Tenant integrations | No - merge into tenant_settings |

---

### AI Features (3 tables)

| Table | Purpose | MVP? |
|-------|---------|------|
| `ai_actions` | AI action log | No - not MVP |
| `ai_agent_config` | AI configuration | No |
| `ai_prompts` | Prompt history | No |

**Note:** AI assistant is explicitly out of scope for MVP.

---

### Auth & Permissions (6 tables)

| Table | Purpose | MVP? |
|-------|---------|------|
| `permissions` | Permission definitions | No - use Clerk roles |
| `role_types` | Role definitions | No - use Clerk |
| `user_role_assignments` | User-role junction | No - use Clerk |
| `user_approvals` | User approval workflow | No - Phase 2 |
| `login_attempts` | Login tracking | No - Clerk handles |
| `rate_limits` | Rate limiting | No - use middleware |

**Note:** Clerk handles auth, organizations, and roles. No need for custom auth tables.

---

### Notifications (3 tables)

| Table | Purpose | MVP? |
|-------|---------|------|
| `notifications` | Notification records | No - Phase 2 |
| `user_notifications` | User junction | No |
| `user_notification_preferences` | Settings | No |

---

### Support (2 tables)

| Table | Purpose | MVP? |
|-------|---------|------|
| `support_tickets` | Support tickets | No - not MVP |
| `ticket_replies` | Ticket responses | No |

---

### Security & Audit (7 tables)

| Table | Purpose | MVP? |
|-------|---------|------|
| `audit_logs` | Activity audit trail | Yes (simplified) |
| `encrypted_fields` | Encrypted data | No - Phase 2 |
| `encryption_audit_log` | Encryption access | No |
| `tenant_keys` | Encryption keys | No |
| `key_recovery_requests` | Key recovery | No |
| `key_recovery_approvals` | Recovery approvals | No |
| `tenant_access_logs` | Access logging | No - merge into audit_logs |

---

### Tenant Config (5 tables)

| Table | Purpose | MVP? |
|-------|---------|------|
| `tenant_settings` | Tenant configuration | Yes (via Clerk metadata) |
| `tenant_dashboard_layouts` | Dashboard customization | No - Phase 2 |
| `feature_customizations` | Feature toggles | No |
| `feature_usage_tracking` | Usage metrics | No |
| `saved_filter_views` | Saved filters | No - Phase 2 |

---

### Tasks (2 tables)

| Table | Purpose | MVP? |
|-------|---------|------|
| `tasks` | Standalone tasks | Yes |
| `task_checklist_items` | Checklist items | No - Phase 2 |

---

## Database Functions (~40)

Most of these are RLS helpers or business logic that should live in application code:

| Function | Purpose | MVP? |
|----------|---------|------|
| `approve_user` | User approval flow | No |
| `reject_user` | User rejection | No |
| `log_audit_action` | Audit logging | Maybe - or app code |
| `get_user_role` | Role lookup | No - use Clerk |
| `has_resource_permission` | Permission check | No - use Clerk |
| `user_has_permission` | Permission check | No - use Clerk |
| `is_tenant_admin_*` | Admin checks | No - use Clerk |
| `get_tenant_users_*` | User queries | No - use Clerk |
| `initialize_application_workflow` | Workflow init | No - app code |
| `complete_workflow_task_*` | Task completion | No - app code |
| `create_workflow_snapshot` | Snapshots | No |
| `evaluate_trigger_conditions` | Automation | No |
| `execute_trigger_actions` | Automation | No |
| `get_current_workflow_task` | Task lookup | No - simple query |
| `log_encryption_event` | Encryption audit | No |
| `log_sensitive_access` | Access logging | No |
| `upsert_contact_custom_field` | Custom fields | No |
| `upsert_custom_field` | Custom fields | No |
| `filter_*` | RLS helpers | No - simpler RLS |
| `get_*` | Various lookups | Most can be queries |
| `track_feature_usage` | Analytics | No |
| `increment_custom_field_usage` | Analytics | No |

---

## MVP Schema

### Overview

**Note:** This schema stores application data only. Temporal.io maintains its own persistence layer for workflow execution state, history, timers, and signals. The database below stores business data (contacts, workflow executions, tasks), while Temporal handles the actual workflow orchestration.

**Terminology:**
- **Workflow Definition** = Blueprint with steps, conditions, triggers (stored in `workflow_definitions`)
- **Workflow Execution** = Instance/run of a workflow definition (stored in `workflow_executions`)
- **Application Tracking** = One example use case of workflow executions

```
organizations (via Clerk - no table needed)
├── users (via Clerk - synced to local table for app data)

10 tables total:
├── users (Clerk sync)
├── contacts
├── workflow_definitions (blueprints: steps, triggers, conditions)
├── workflow_executions (instances: active runs of workflows)
├── tasks
├── notes
├── activity_log
├── formstack_config
├── formstack_submissions
└── (Clerk handles: orgs, auth, roles, sessions)
└── (Temporal handles: workflow execution state, history, retries)
```

---

### MVP Table Definitions

#### `users`
Synced from Clerk via webhook. Minimal local data.

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,  -- Clerk user ID
  org_id        TEXT NOT NULL,     -- Clerk org ID
  email         TEXT NOT NULL,
  first_name    TEXT,
  last_name     TEXT,
  role          TEXT DEFAULT 'user',  -- DEPRECATED: use roles array
  roles         TEXT[] DEFAULT '{}',  -- NEW: Array of roles (admin, reviewer, hr, manager)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_roles ON users USING GIN(roles);
```

#### `contacts`
People/applicants. Flattened address, no junction tables.

```sql
CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  address_line_1  TEXT,
  address_line_2  TEXT,
  city            TEXT,
  state           TEXT,
  zip             TEXT,
  metadata        JSONB DEFAULT '{}',  -- custom fields go here
  tags            TEXT[] DEFAULT '{}', -- simple array of tags
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_org ON contacts(org_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_name ON contacts(last_name, first_name);
```

#### `workflow_definitions`
Workflow blueprints with steps, triggers, and conditions. Defines HOW a workflow should execute.

```sql
CREATE TABLE workflow_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  name            TEXT NOT NULL,  -- "Application Review Workflow"
  description     TEXT,
  phases          JSONB DEFAULT '[]',  -- NEW: Array of phase definitions for visual grouping
  steps           JSONB NOT NULL DEFAULT '{"steps": []}',  -- Array of step definitions
  variables       JSONB DEFAULT '{}',  -- Variable definitions this workflow needs
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_definitions_org ON workflow_definitions(org_id);
CREATE INDEX idx_workflow_definitions_active ON workflow_definitions(org_id, is_active);

-- Example phases JSONB:
-- {
--   "phases": [
--     {
--       "id": "phase_1",
--       "name": "Initial Review",
--       "description": "Review application and assign tasks",
--       "order": 1,
--       "step_ids": ["step_1", "step_2", "step_3"]
--     }
--   ]
-- }

-- Example steps JSONB structure:
-- {
--   "steps": [
--     {
--       "id": "step_1",
--       "order": 1,
--       "phase_id": "phase_1",  -- NEW: Link to phase
--       "type": "trigger",
--       "name": "Form Submitted",
--       "config": { "trigger_type": "form_submission" }
--     },
--     {
--       "id": "step_2",
--       "order": 2,
--       "phase_id": "phase_1",
--       "type": "assign_task",
--       "name": "Assign Review",
--       "config": {
--         "title": "Review Application",
--         "assign_to": { "type": "role", "role": "reviewer" }
--       }
--     },
--     {
--       "id": "step_3",
--       "order": 3,
--       "phase_id": "phase_1",
--       "type": "wait_for_task",
--       "name": "Wait for Review",
--       "config": { "task_from_step": "step_2", "timeout_days": 3 }
--     },
--     {
--       "id": "step_4",
--       "order": 4,
--       "phase_id": "phase_1",
--       "type": "wait_for_approval",  -- NEW: Approval step type
--       "name": "Manager Approval",
--       "config": {
--         "title": "Review Application",
--         "assign_to": { "type": "role", "role": "manager" },
--         "approval_options": {
--           "approve_label": "Approve",
--           "reject_label": "Reject",
--           "require_comment": true
--         }
--       }
--     },
--     {
--       "id": "step_5",
--       "order": 5,
--       "phase_id": "phase_2",
--       "type": "condition",
--       "name": "Check Outcome",
--       "config": {
--         "field": "{{step_4.outcome}}",
--         "branches": [
--           { "if": "approved", "then_goto": "step_6" },
--           { "if": "rejected", "then_goto": "step_9" }
--         ]
--       }
--     }
--   ]
-- }
```

#### `workflow_executions`
Active instances/runs of workflow definitions. Each row is one execution (e.g., "John Doe's Application").

```sql
CREATE TABLE workflow_executions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  TEXT NOT NULL,
  workflow_definition_id  UUID NOT NULL REFERENCES workflow_definitions(id),
  contact_id              UUID NOT NULL REFERENCES contacts(id),
  current_step_id         TEXT,  -- Which step is currently executing
  current_phase_id        TEXT,  -- NEW: Track current phase for UI progress
  status                  TEXT NOT NULL DEFAULT 'running',  -- running, completed, failed, paused
  variables               JSONB DEFAULT '{}',  -- Runtime variables for this execution
  source                  TEXT DEFAULT 'manual',  -- manual, formstack, api, etc.
  source_id               TEXT,  -- external reference ID
  started_at              TIMESTAMPTZ DEFAULT NOW(),
  completed_at            TIMESTAMPTZ,
  temporal_workflow_id    TEXT,  -- Temporal workflow execution ID
  temporal_run_id         TEXT,  -- Temporal run ID
  metadata                JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_executions_org ON workflow_executions(org_id);
CREATE INDEX idx_workflow_executions_contact ON workflow_executions(contact_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(org_id, status);
CREATE INDEX idx_workflow_executions_definition ON workflow_executions(workflow_definition_id);
CREATE INDEX idx_workflow_executions_temporal ON workflow_executions(temporal_workflow_id);
```

#### `tasks`
Tasks linked to workflow executions or contacts. Created by workflow steps or manually.

```sql
CREATE TABLE tasks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                TEXT NOT NULL,
  workflow_execution_id UUID REFERENCES workflow_executions(id),
  contact_id            UUID REFERENCES contacts(id),
  assigned_to           TEXT REFERENCES users(id),      -- Specific user if claimed
  assigned_role         TEXT,                            -- NEW: Role if role-based assignment
  title                 TEXT NOT NULL,
  description           TEXT,
  task_type             TEXT DEFAULT 'standard',         -- NEW: standard, approval
  status                TEXT NOT NULL DEFAULT 'todo',    -- todo, in_progress, done
  priority              TEXT DEFAULT 'medium',           -- low, medium, high
  outcome               TEXT,                            -- NEW: approved, rejected, completed, etc.
  outcome_comment       TEXT,                            -- NEW: Comment from approver
  position              INTEGER DEFAULT 0,               -- For drag-and-drop ordering
  due_date              DATE,
  completed_at          TIMESTAMPTZ,
  created_by_step_id    TEXT,  -- Which workflow step created this task
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_org ON tasks(org_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_role ON tasks(assigned_role) WHERE assigned_role IS NOT NULL;
CREATE INDEX idx_tasks_status ON tasks(org_id, status);
CREATE INDEX idx_tasks_workflow_execution ON tasks(workflow_execution_id);
CREATE INDEX idx_tasks_position ON tasks(org_id, status, position);  -- For kanban ordering
```

#### `notes`
Notes on any entity (workflow executions, contacts, tasks). Uses hybrid polymorphic approach with soft FKs.

```sql
CREATE TABLE notes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                TEXT NOT NULL,
  entity_type           TEXT NOT NULL,  -- 'workflow_execution', 'contact', 'task' (for rendering)
  entity_id             UUID NOT NULL,
  -- Soft FKs for sane queries (nullable, indexed)
  workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  contact_id            UUID REFERENCES contacts(id) ON DELETE CASCADE,
  task_id               UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id               TEXT NOT NULL REFERENCES users(id),
  content               TEXT NOT NULL,
  is_internal           BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure only one FK is set
  CONSTRAINT one_parent_only CHECK (
    (workflow_execution_id IS NOT NULL)::int +
    (contact_id IS NOT NULL)::int +
    (task_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX idx_notes_entity ON notes(entity_type, entity_id);
CREATE INDEX idx_notes_org ON notes(org_id);
CREATE INDEX idx_notes_workflow_execution ON notes(workflow_execution_id) WHERE workflow_execution_id IS NOT NULL;
CREATE INDEX idx_notes_contact ON notes(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_notes_task ON notes(task_id) WHERE task_id IS NOT NULL;

-- Note: Soft FKs prevent N+1 queries and enable fast lookups like:
-- SELECT * FROM notes WHERE workflow_execution_id = ? (uses index, no table scan)
```

#### `activity_log`
Audit trail for compliance. Uses hybrid polymorphic approach with soft FKs.

```sql
CREATE TABLE activity_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                TEXT NOT NULL,
  user_id               TEXT REFERENCES users(id),
  entity_type           TEXT NOT NULL,  -- 'workflow_execution', 'contact', 'task' (for rendering)
  entity_id             UUID NOT NULL,
  -- Soft FKs for sane queries (nullable, indexed)
  workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  contact_id     UUID REFERENCES contacts(id) ON DELETE CASCADE,
  task_id        UUID REFERENCES tasks(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,  -- 'created', 'updated', 'deleted', 'status_changed'
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_org ON activity_log(org_id);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_time ON activity_log(created_at DESC);
CREATE INDEX idx_activity_workflow_execution ON activity_log(workflow_execution_id) WHERE workflow_execution_id IS NOT NULL;
CREATE INDEX idx_activity_contact ON activity_log(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_activity_task ON activity_log(task_id) WHERE task_id IS NOT NULL;

-- Note: This prevents complex unions and enables efficient queries like:
-- SELECT * FROM activity_log WHERE workflow_execution_id = ? ORDER BY created_at DESC
```

#### `formstack_config`
Formstack integration settings per org.

```sql
CREATE TABLE formstack_config (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    TEXT NOT NULL UNIQUE,
  webhook_secret            TEXT,
  field_mappings            JSONB DEFAULT '{}',  -- maps Formstack field IDs to our fields
  default_workflow_definition_id UUID REFERENCES workflow_definitions(id),
  is_active                 BOOLEAN DEFAULT true,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Example field_mappings:
-- {
--   "12345": "first_name",
--   "12346": "last_name",
--   "12347": "email",
--   "12348": "phone"
-- }
```

#### `formstack_submissions`
Raw Formstack webhook payloads for debugging/reprocessing.

```sql
CREATE TABLE formstack_submissions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                TEXT NOT NULL,
  form_id               TEXT NOT NULL,
  submission_id         TEXT NOT NULL,
  raw_payload           JSONB NOT NULL,
  processed             BOOLEAN DEFAULT false,
  workflow_execution_id UUID REFERENCES workflow_executions(id),
  error                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, submission_id)  -- Prevent duplicate webhook processing
);

CREATE INDEX idx_formstack_org ON formstack_submissions(org_id);
CREATE INDEX idx_formstack_processed ON formstack_submissions(processed) WHERE NOT processed;

-- Note: UNIQUE constraint prevents duplicate webhooks (Formstack retries on failure)
```

---

### MVP vs Current: Side-by-Side

| Domain | Current Tables | MVP Tables |
|--------|---------------|------------|
| Auth/Users | 6 tables + Supabase Auth | Clerk + 1 sync table |
| Contacts | 7 tables | 1 table |
| Workflow Definitions | 16 tables (builder) | 1 table (steps in JSONB) |
| Workflow Executions | 6 tables | 1 table |
| Tasks | 2 tables | 1 table |
| Custom Fields | 3 tables | JSONB columns |
| Forms/Integrations | 7 tables | 2 tables |
| AI | 3 tables | None |
| Notifications | 3 tables | None (Phase 2) |
| Support | 2 tables | None |
| Security/Audit | 7 tables | 2 tables (notes + activity_log) |
| Tenant Config | 5 tables | Clerk metadata |
| **Total** | **~65 tables** | **10 tables** |

---

### Entity Relationship Diagram (MVP)

```
┌─────────────────┐
│     Clerk       │
│  Organizations  │
└────────┬────────┘
         │ org_id
         ▼
┌─────────────────┐      ┌──────────────────────┐
│     users       │      │ workflow_definitions │
│  (Clerk sync)   │      │   (blueprints)       │
└────────┬────────┘      └──────────┬───────────┘
         │                          │
         │ assigned_to              │ workflow_definition_id
         │                          │
         ▼                          ▼
┌─────────────────┐      ┌──────────────────────┐
│     tasks       │◄─────│ workflow_executions  │
└─────────────────┘      │    (instances)       │
                         └──────────┬───────────┘
                                    │
                                    │ contact_id
                                    ▼
                           ┌─────────────────┐
                           │    contacts     │
                           └─────────────────┘

┌─────────────────┐      ┌─────────────────┐
│     notes       │      │  activity_log   │
│ (polymorphic)   │      │  (polymorphic)  │
└─────────────────┘      └─────────────────┘
  references:              references:
  - workflow_executions    - workflow_executions
  - contacts               - contacts
  - tasks                  - tasks

┌─────────────────┐      ┌─────────────────┐
│ formstack_      │      │ formstack_      │
│ config          │      │ submissions     │
└─────────────────┘      └─────────────────┘
  → default_               → workflow_
    workflow_definition      execution_id
```

---

## Migration Strategy

### Don't Migrate the Schema

The current schema has 325 migrations of accumulated drift. Start fresh:

1. **Export domain knowledge** - field names, status values, business rules
2. **Create new schema** - 9 clean tables with Drizzle
3. **Data migration script** - if needed, write a one-time ETL script
4. **New database** - Railway Postgres, clean slate

### Data to Potentially Migrate

If there's production data worth keeping:

| Source Table | Destination | Notes |
|--------------|-------------|-------|
| `contacts` | `contacts` | Flatten address fields |
| `applications` | `applications` | Map status values |
| `profiles` | `users` | Basic user info |

### Data to Leave Behind

- Workflow builder documents (not used in MVP)
- AI prompts/actions (not in MVP)
- Custom field definitions (use JSONB)
- Encryption keys (start fresh with Clerk)
- 325 migrations (burn it down)

---

## Appendix: Current Table List (Alphabetical)

```
addresses
ai_actions
ai_agent_config
ai_prompts
application_ingestions
application_notes
application_snapshots
application_task_status
application_workflow_snapshots
applications
audit_logs
contact_addresses
contact_custom_fields
contact_files
contact_sync_mappings
contact_tags
contacts
custom_field_groups
custom_field_subgroups
custom_fields
encrypted_fields
encryption_audit_log
feature_customizations
feature_usage_tracking
form_integrations
form_submission_snapshots
form_submissions
form_templates
integration_sync_logs
integrations_sitestacker
key_recovery_approvals
key_recovery_requests
login_attempts
notifications
permissions
profiles
rate_limits
role_types
saved_filter_views
stages
support_tickets
tags
task_checklist_items
tasks
tenant_access_logs
tenant_dashboard_layouts
tenant_integrations
tenant_keys
tenant_settings
tenants
ticket_replies
user_approvals
user_notification_preferences
user_notifications
user_role_assignments
workflow_builder_documents
workflow_builder_revisions
workflow_fields
workflow_instance_tasks
workflow_instances
workflow_status_templates
workflow_statuses
workflow_steps
workflow_task_dependencies
workflow_task_fields
workflow_task_triggers
workflow_tasks
workflow_trigger_executions
workflows
```

---

## Appendix: Current Function List

```
app_log_action_safe
approve_user
can_view_profile_details
complete_workflow_task_with_progression
create_notification
create_workflow_snapshot
delete_application
evaluate_trigger_conditions
execute_trigger_actions
filter_contacts_by_tag_permissions
filter_custom_fields_from_contact
get_current_workflow_task
get_descendant_groups
get_or_create_tenant_by_domain
get_status_transition_warning
get_tenant_storage_usage
get_tenant_users_for_assignment
get_user_profile
get_user_readable_custom_fields
get_user_readable_tags
get_user_role
has_resource_permission
increment_custom_field_usage
initialize_application_workflow
is_current_user_tenant_admin
is_tenant_admin_by_user_id
is_tenant_admin_or_owner
log_audit_action
log_encryption_event
log_sensitive_access
log_user_session_start
reject_user
resolve_permission_with_inheritance
set_request_context
system_tenant
track_feature_usage
upsert_contact_custom_field
upsert_custom_field
user_can_read_custom_field
user_can_read_tag
user_can_update_custom_field
user_has_permission
```
