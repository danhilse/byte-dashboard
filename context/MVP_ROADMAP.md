# MVP Roadmap: Byte Dashboard Rebuild

**Goal:** Build a lightweight system for tracking people through multi-step processes.

**Primary Use Case:** Applicant onboarding and tracking for Fayette County Sheriff's Office.

**Note:** Internally we use "workflow" terminology. Application tracking is the primary use case, but workflows are the generalized system.

---

## Current Status (Updated: Feb 7, 2026)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Foundation | ✅ **COMPLETE** | Auth, DB, basic Temporal setup done. Code rolled back to clean state. |
| Phase 2: Hardcoded Workflow E2E | ✅ **COMPLETE** | Hardcoded applicant review workflow validates Temporal architecture end-to-end. |
| Phase 3: Core CRUD | ✅ **COMPLETE** | Contacts + Workflow Executions CRUD fully implemented. |
| Phase 4: Tasks & Kanban | ⚪ **NEXT** | Task management with workflow signaling. |
| Phase 5: Workflow Builder | ⚪ Not Started | Generic builder (now informed by real workflow experience). |
| Phase 6: Dashboard & Reporting | ⚪ Not Started | |
| Phase 7: Polish & Launch Prep | ⚪ Not Started | |

**Roadmap Rationale:**
- Phase 2 de-risks 70% of the system by validating Temporal integration early
- Building one real workflow reveals what the generic builder actually needs
- Avoids overbuilding the builder without execution feedback

**Next Steps:**
1. Phase 4: Tasks with atomic claiming and workflow signaling
2. Phase 5: Generic workflow builder (informed by Phase 2 learnings)
3. Phase 6: Dashboard & Reporting

---

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1.6 (App Router) |
| Auth | Clerk (with Organizations for multi-tenant) |
| Database | PostgreSQL via Neon or Railway |
| Workflow Engine | Temporal.io (TypeScript SDK) |
| ORM | Drizzle |
| Styling | Tailwind CSS + shadcn/ui |
| State/Data | TanStack React Query |
| Forms | React Hook Form + Zod |
| Deployment | Vercel (frontend) + Temporal Cloud + Railway (workers) |

**Notes:**
- Use **Temporal Cloud for MVP** to avoid ops overhead (upgrades, backups, DR, observability)
- Self-host Temporal Server only post-PMF if costs ($500+/month) justify eng time for 24/7 ops
- Temporal workers run on Railway, connect to Temporal Cloud
- API routes handle Next.js endpoints (Vercel Edge Functions)

---

## Data Model

Core entities (~10 tables):

**Note:** This schema is for application data only. Temporal.io maintains its own persistence layer for workflow execution state, history, timers, and signals.

```
organizations (via Clerk - no table needed)
├── users (via Clerk - synced to local table for app data)

workflow_executions (instances of definitions)
├── id
├── organization_id
├── workflow_definition_id (FK)
├── definition_version (frozen at execution time)
├── contact_id (FK)
├── current_step_id
├── current_phase_id
├── status (presentation-only, Temporal is authoritative)
├── updated_by_temporal
├── source (manual, formstack, api)
├── source_id (external reference)
├── started_at
├── completed_at
├── temporal_workflow_id
├── temporal_run_id
├── variables (JSONB)
├── metadata (JSONB)
├── created_at
├── updated_at

contacts
├── id
├── org_id
├── first_name
├── last_name
├── email
├── phone
├── company
├── role
├── status (active, inactive, lead)
├── avatar_url
├── last_contacted_at
├── address_line_1
├── address_line_2
├── city
├── state
├── zip
├── metadata (JSONB - custom fields)
├── tags (TEXT[] - simple array)
├── created_at
├── updated_at

tasks
├── id
├── org_id
├── workflow_execution_id (FK, nullable)
├── contact_id (FK, nullable)
├── assigned_to (user_id, nullable - specific user if claimed)
├── assigned_role (nullable - role if role-based assignment)
├── title
├── description
├── task_type (standard, approval)
├── status (todo, in_progress, done)
├── priority (low, medium, high)
├── outcome (approved, rejected, completed, etc.)
├── outcome_comment (comment from approver)
├── position (for drag-and-drop ordering)
├── due_date
├── completed_at
├── created_by_step_id (which workflow step created this task)
├── metadata (JSONB)
├── created_at
├── updated_at

workflow_definitions (blueprints)
├── id
├── org_id
├── name
├── description
├── version (immutable versioning - edit = clone + increment)
├── phases (JSONB - array of phase definitions for visual grouping)
├── steps (JSONB - array of step definitions)
├── variables (JSONB - variable definitions)
├── statuses (JSONB - ordered array of status objects for UI)
├── is_active
├── created_at
├── updated_at

**Note:** `workflow_definitions` stores UI metadata (status labels, colors, badge variants) and step definitions. Temporal handles actual workflow execution, state, and orchestration.

activity_log
├── id
├── org_id
├── entity_type (workflow_execution, contact, task)
├── entity_id
├── workflow_execution_id (FK, nullable, indexed)
├── contact_id (FK, nullable, indexed)
├── task_id (FK, nullable, indexed)
├── user_id
├── action (created, updated, deleted, status_changed)
├── details (JSONB)
├── created_at

notes
├── id
├── org_id
├── entity_type (workflow_execution, contact, task)
├── entity_id
├── workflow_execution_id (FK, nullable, indexed)
├── contact_id (FK, nullable, indexed)
├── task_id (FK, nullable, indexed)
├── user_id
├── content
├── is_internal
├── created_at

formstack_config
├── id
├── org_id (unique)
├── webhook_secret
├── field_mappings (JSONB)
├── default_workflow_definition_id (FK to workflow_definitions)
├── is_active
├── created_at
├── updated_at

formstack_submissions
├── id
├── org_id
├── form_id
├── submission_id (unique per org - prevents duplicate webhooks)
├── raw_payload (JSONB)
├── processed
├── workflow_execution_id (FK, nullable)
├── error
├── created_at

users (sync from Clerk)
├── id (matches Clerk user ID)
├── organization_id
├── email
├── first_name
├── last_name
├── role (DEPRECATED - use roles)
├── roles (TEXT[] - admin, reviewer, hr, manager)
├── created_at
├── updated_at
```

---

## Build Phases

### Phase 1: Foundation (MOSTLY COMPLETE)

**Auth & Multi-tenant Setup**
- [x] Next.js project scaffold
- [x] Clerk integration
- [x] Clerk Organizations enabled
- [x] Middleware for org-scoped routes
- [ ] User sync webhook (Clerk → local users table)
- [ ] Role-based access (Owner, Admin, User) - _placeholder implemented_

**Database & ORM**
- [x] Railway/Neon Postgres provisioned
- [x] Drizzle schema setup
- [ ] Initial migrations - _using db:push instead_
- [x] Database connection utilities

**Temporal Setup**
- [x] Install @temporalio/client and @temporalio/worker
- [x] Configure Temporal connection (local dev or Temporal Cloud)
- [x] Set up worker process
- [x] Create first simple workflow (hello world)
- [x] API route to start workflows
- [x] Worker scripts in package.json
- [ ] **USER ACTION REQUIRED:** Install Temporal CLI (`brew install temporal`)
- [ ] **USER ACTION REQUIRED:** Test workflow execution end-to-end

**UI Foundation**
- [x] Tailwind config
- [x] shadcn/ui components installed
- [x] Layout components (sidebar, header, page container)
- [x] Basic navigation

**Deliverable:** User can sign up, create org, see dashboard. ~~Temporal workflows execute successfully.~~ _Temporal deferred to Phase 6_

---

### Phase 2: Hardcoded Workflow E2E

**Rationale:** Build one complete workflow end-to-end with Temporal BEFORE building the generic builder. This validates the architecture and reveals what the builder actually needs.

**Workflow to Build:** Applicant Review Workflow (hardcoded)

**Steps in Hardcoded Workflow:**
1. Trigger: Form submission (create contact, create execution)
2. Assign Task: "Review Application" (assign to role: reviewer)
3. Wait for Task: Wait for review completion (with timeout)
4. Wait for Approval: "Manager Approval" (approve/reject with comment)
5. Condition: Branch on approval outcome
   - If approved → Step 6
   - If rejected → Step 8
6. Update Status: Set execution status to "approved"
7. Send Email: "Welcome to the team"
8. Update Status: Set execution status to "rejected"

**Implementation Tasks:**

**Database Updates**
- [x] Add `version` column to workflow_definitions
- [x] Add `definition_version` column to workflow_executions
- [x] Add `updated_by_temporal` column to workflow_executions
- [x] Add `assigned_role`, `task_type`, `outcome`, `outcome_comment` to tasks
- [x] Create initial hardcoded workflow definition in seed data

**Temporal Workflows**
- [x] Implement `applicant-review-workflow.ts` (hardcoded steps)
- [x] Test workflow execution locally (Temporal CLI)
- [x] Implement activities:
  - [x] `createTask(executionId, taskConfig)` - Create task in DB
  - [x] `setWorkflowStatus(executionId, status)` - Update execution status (centralized)
  - [x] `sendEmail(to, subject, body)` - Send email (stub or real SendGrid)
  - [x] `updateContact(contactId, fields)` - Update contact fields

**Signal Handling**
- [x] Implement `taskCompleted` signal handler
- [x] Implement `approvalSubmitted` signal handler
- [ ] Test signal flow: Task completion → signal → workflow resumes _(deferred to Phase 3/4 with full task UI)_

**API Routes**
- [x] POST /api/workflows/trigger - Start workflow execution
- [x] PATCH /api/tasks/:id/status - Update task status + signal workflow
- [x] PATCH /api/tasks/:id/approve - Approve with comment + signal workflow
- [x] PATCH /api/tasks/:id/reject - Reject with comment + signal workflow
- [x] GET /api/workflows/:id - Get execution details

**UI (Minimal for Testing)**
- [x] Simple form to trigger workflow (contact selection)
- [x] Task detail view with "Approve" / "Reject" buttons for approval tasks
- [x] Workflow execution detail view (status, current step)

**Validation Goals:**
- [x] ✅ Workflow starts successfully via API
- [x] ✅ Task created by workflow appears in DB (confirmed via worker logs)
- [ ] ✅ Task completion signals workflow correctly _(infrastructure ready, testing deferred to Phase 3/4)_
- [ ] ✅ Approval branching works (approve path vs reject path) _(infrastructure ready, testing deferred to Phase 3/4)_
- [x] ✅ Workflow execution status updates from Temporal activity only
- [x] ✅ External signal flow infrastructure works (API routes + signal handlers implemented)
- [x] ✅ Workflow survives server restart (proven by worker reconnection)

**Deliverable:** One complete applicant review workflow running end-to-end with Temporal, proving the architecture works.

**✅ PHASE 2 COMPLETE (Feb 6, 2026)**
- Hardcoded workflow executes successfully
- Activities create tasks in database
- Worker connects to Temporal and processes workflows
- Signal handlers implemented and ready for testing
- Architecture validated - ready for Phase 3

---

### Phase 3: Core CRUD (Updated)

### Phase 3: Core CRUD (Contacts + Workflow Executions)

**Note:** Phase 2 proved the architecture works. Now build the full CRUD layer.

**Contacts** ✅ **COMPLETE (Feb 7, 2026)**
- [x] Contact list page (table with search/filter)
- [x] Contact detail page
- [x] Create contact form
- [x] Edit contact
- [x] Delete contact
- [x] Contact API routes (GET, POST, PATCH, DELETE)

**Workflow Executions** ✅ **COMPLETE (Feb 7, 2026)**
- [x] Workflow execution list page (table/kanban/grid with filters)
- [x] Workflow execution detail page (DB query with joined contact/definition)
- [x] Create workflow dialog (contact picker + definition picker)
- [x] Edit workflow (detail dialog with useDetailDialogEdit hook)
- [x] Delete workflow (with Temporal warning)
- [x] Workflow execution API routes (GET, POST, PATCH, DELETE)
- [x] Status display with all 10 statuses in kanban
- [x] Optimistic status updates via kanban drag-and-drop
- [x] Workflow definitions API route (GET for definition picker)
- [x] Removed 9 deprecated mock fields from Workflow type
- [x] Deleted mock workflows data file

✅ **PHASE 3 COMPLETE (Feb 7, 2026)** — Contacts + Workflow Executions CRUD fully implemented with real DB queries.

**Deliverable:** User can manage contacts and create/view/edit/delete workflow executions

---

### Phase 4: Tasks & Kanban

**Task Management**
- [ ] Task list page (My Work page with table/kanban/grid views)
- [ ] Create task form (manual task creation)
- [ ] Task detail dialog (view/edit)
- [ ] Assign task to user OR role (role-based assignment)
- [ ] "Available Tasks" section (unclaimed role-based tasks)
- [ ] "Claim Task" functionality with atomic UPDATE (see Invariant 5)
- [ ] Approval task UI (Approve/Reject buttons for approval tasks)
- [ ] Due date picker
- [ ] Task status (todo, in_progress, done)
- [ ] Link task to workflow execution or contact

**Task API Routes**
- [ ] GET /api/tasks (list tasks, filter by assignee/status/role)
- [ ] POST /api/tasks (create task - manual or from workflow)
- [ ] GET /api/tasks/:id (get task details)
- [ ] PATCH /api/tasks/:id (update task fields)
- [ ] PATCH /api/tasks/:id/status (update status + conditional workflow signal)
- [ ] **PATCH /api/tasks/:id/claim** - Atomic claim with race condition handling:
  ```typescript
  // UPDATE tasks SET assigned_to = ? WHERE id = ? AND assigned_to IS NULL
  // Return 409 if already claimed (affected rows = 0)
  ```
- [ ] PATCH /api/tasks/:id/approve (approve with comment + signal)
- [ ] PATCH /api/tasks/:id/reject (reject with comment + signal)
- [ ] DELETE /api/tasks/:id (delete task)

**Task ↔ Workflow Integration**
- [ ] Task status update logic:
  - Update task in DB
  - Check if `workflow_execution_id` exists
  - If yes, send Temporal signal `taskCompleted`
  - Workflow resumes from `wait_for_task` step
- [ ] Standalone task support (no workflow signal if `workflow_execution_id` is null)
- [ ] Task creation from workflow activities (store `created_by_step_id`)

**Atomic Task Claiming (Invariant 5)**
- [ ] Implement atomic claim endpoint with WHERE assigned_to IS NULL
- [ ] Return 409 Conflict if task already claimed
- [ ] UI: Show toast "This task was just claimed by someone else"
- [ ] UI: No optimistic updates (wait for server response)
- [ ] Test concurrent claim attempts (simulate race condition)

**Kanban Board**
- [ ] Kanban view component (GenericKanbanBoard - reusable)
- [ ] Drag-and-drop between columns
- [ ] Column = status
- [ ] Card = task with key info
- [ ] Drag updates task status (triggers API call with signaling)

**Deliverable:** User can create tasks, assign them, manage via Kanban. Task claiming is race-condition-safe. Tasks signal workflows correctly.

---

### Phase 5: Workflow Builder

**Note:** Now that we have real workflow experience from Phase 2, we can build a generic builder informed by actual requirements.

**Workflow Definition UI**
- [ ] Workflow builder page (`/admin/workflow-builder`)
- [ ] List of workflow definitions (table) with version display
- [ ] Create new workflow definition form (name, description)
- [ ] Edit workflow definition (clones + increments version - see Invariant 4)
- [ ] Version history view (show all versions of a definition)

**Step Builder UI**
- [ ] Linear step list component (vertical, draggable cards)
- [ ] Add step button with type selector
- [ ] Drag-and-drop reordering (dnd-kit)
- [ ] Step configuration panel (right sidebar or modal)
- [ ] Delete step functionality

**Phase Management UI**
- [ ] Phase grouping in step list (collapsible sections)
- [ ] Add/edit/delete phases
- [ ] Drag steps between phases
- [ ] Phase progress indicator in execution view

**Step Type Components**
- [ ] Trigger step config (form_submission, manual)
- [ ] Assign Task step config (title, assignee role/user selector, description)
- [ ] Wait for Task step config (task reference, timeout)
- [ ] Wait for Approval step config (approve/reject buttons, require comment)
- [ ] Update Task step config (task reference, field updates)
- [ ] Update Contact step config (field mappings)
- [ ] Update Status step config (status selector)
- [ ] Send Email step config (to, subject, template)
- [ ] Condition step config (field, simple if/then branches)
- [ ] Delay step config (duration in days/hours)

**Variable System**
- [ ] Variable templating UI (e.g., `{{contact.email}}`)
- [ ] Variable picker/autocomplete
- [ ] Variable definitions for workflow

**API & Database**
- [ ] Workflow definition API routes (CRUD with versioning)
- [ ] Save/load workflow definitions from DB
- [ ] Validate workflow definition structure
- [ ] Implement immutable versioning (edit = clone + deactivate old)

**Generic Workflow Interpreter**
- [ ] Refactor hardcoded workflow into generic interpreter
- [ ] Read workflow definition from DB
- [ ] Execute steps based on definition JSONB
- [ ] Support all step types dynamically
- [ ] Test generic workflow with multiple definitions

**Deliverable:** User can create, edit, and manage workflow definitions with linear steps. Generic interpreter executes any user-defined workflow.

---

### Phase 6: Dashboard & Reporting

**Dashboard Widgets**
- [ ] Workflow count by status (pie/bar chart)
- [ ] Recent workflows list
- [ ] My tasks widget
- [ ] Workflows over time (line chart)

**Dashboard Page**
- [ ] Widget grid layout
- [ ] Date range filter (optional for MVP)

**Activity & Notes**
- [ ] Activity log on workflow detail (polymorphic with soft FKs)
- [ ] Activity log on contact detail
- [ ] Add note to workflow/contact
- [ ] Activity feed widget on dashboard

**Exports**
- [ ] CSV export for workflows
- [ ] CSV export for contacts
- [ ] Basic PDF report (workflow summary)

**Deliverable:** User sees pipeline overview, full audit trail, can export data

---

### Phase 7: Polish & Launch Prep

**UX Polish**
- [ ] Loading states
- [ ] Error handling
- [ ] Empty states
- [ ] Toast notifications
- [ ] Responsive design check

**Security & Compliance**
- [ ] Org isolation audit (no cross-tenant data leaks)
- [ ] Role permission audit
- [ ] Input validation review
- [ ] Rate limiting on API routes

**Testing**
- [ ] Core flow E2E tests
- [ ] Auth flow tests
- [ ] Formstack webhook tests

**Deliverable:** Production-ready MVP

---

## Feature Details

### Workflow Statuses (Default)

For application tracking workflows, configurable per org, but sensible defaults:

```
1. Submitted (or "draft")
2. In Review (or "under_review")
3. Background Check (or "pending")
4. Interview Scheduled (or "on_hold")
5. Interview Complete
6. Approved
7. Rejected
8. On Hold
```

**Note:** These map to WorkflowStatus type. Status values come from workflow_definitions table.

### User Roles

Leveraging Clerk's built-in org roles:

| Role | Permissions |
|------|-------------|
| Owner | Full access, manage org settings, manage users |
| Admin | Full access to data, can assign tasks |
| User | View/edit assigned items, limited create |
| Guest | Read-only access (future) |

### Formstack Webhook Payload

Expect something like:

```json
{
  "FormID": "12345",
  "UniqueID": "abc-123",
  "Field1": "John",
  "Field2": "Doe",
  "Field3": "john@example.com",
  ...
}
```

Field mapping config maps Field IDs to contact/workflow fields.

---

## Post-MVP Features

These features will be built after the core platform is proven and when specific customer needs arise.

### Formstack Integration (Post-MVP)

**Webhook Ingestion**
- [ ] API route for Formstack webhook
- [ ] Webhook signature verification
- [ ] Field mapping config (Formstack fields → workflow/contact fields)
- [ ] Temporal workflow triggered by webhook (not direct DB writes)
- [ ] Workflow orchestrates: create contact → create workflow instance → send notifications → create tasks
- [ ] Log ingestion in activity_log

**Admin Config**
- [ ] Settings page for Formstack integration
- [ ] Field mapping UI (or config file for MVP)

**Deliverable:** Workflow instances (for application tracking) auto-created via Temporal when Formstack forms submitted. Temporal workflow handles retries and error recovery.

**Note:** This requires Temporal (Phase 5) to be fully functional. Only build when a customer specifically needs Formstack integration.

---

## Not in MVP (Backlog)

These are explicitly deferred until post-PMF:

- [ ] **Asset Management** - Complete asset system deferred to v1.5 (nav placeholder exists, no functionality)
- [ ] **Calendar** - Calendar views and task scheduling deferred to v1.5 (nav placeholder exists, no functionality)
- [ ] Visual drag-and-drop workflow builder
- [ ] AI assistant
- [ ] Payment processing / Stripe
- [ ] Drag-and-drop PDF template designer
- [ ] Calendar integrations / scheduling (Google/Outlook sync)
- [ ] Advanced integrations (Mailchimp, SendGrid, Typeform, etc.)
- [ ] Public applicant portal
- [ ] Email notifications (can add late in MVP if needed)
- [ ] Bulk import/export
- [ ] Custom fields on contacts/applications
- [ ] Advanced reporting / analytics
- [ ] Audit log export

---

## Reference: Old Codebase

When building, reference these from the old repo:

| Need | Where to Look |
|------|---------------|
| Data model ideas | `src/integrations/supabase/types.ts` |
| UI components | `src/components/ui/` (shadcn base) |
| Dashboard layout | `src/components/dashboard/` |
| Workflow fields | `src/pages/Applications.tsx` (old terminology) |
| Contact fields | `src/components/contact/ContactProfile.tsx` |
| Formstack mapping | `supabase/functions/formstack*/` |

---

## Success Criteria

MVP is complete when:

1. New org can sign up via Clerk
2. Users can create workflow definitions (blueprints) with steps, triggers, and logic
3. Users can create workflow instances that execute the defined workflows
4. Users can view/manage contacts and workflow instances
5. Tasks can be created, assigned, and tracked via Kanban
6. Dashboard shows pipeline overview (workflow instance counts by status)
7. Data can be exported to CSV
8. Temporal workflows can orchestrate multi-step processes
9. All data is properly scoped to organization
10. No cross-tenant data leakage
11. UI is polished with proper loading/error states

---

## Open Questions

Resolve before/during build:

1. **Workflow definition architecture** - How do we store and execute user-defined workflows? (Code? Config? Visual builder?)
2. **Workflow builder scope** - MVP: Simple form-based? Or IFTTT-style conditional logic?
3. **Existing data migration** - Any real data in old system that needs migration?
4. **Specific fields required** - Get final list of contact/workflow fields from FCSO
5. **Status workflow specifics** - Confirm the exact workflow statuses for their applicant tracking process
6. **User list** - Who needs accounts for initial pilot?
7. **Compliance requirements** - Any specific security certifications needed at launch?
8. **Temporal Cloud setup** - Provision namespace and get connection credentials
