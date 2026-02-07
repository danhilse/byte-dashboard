# MVP Roadmap: Byte Dashboard Rebuild

**Goal:** Build a lightweight system for tracking people through multi-step processes.

**Primary Use Case:** Applicant onboarding and tracking for Fayette County Sheriff's Office.

**Note:** Internally we use "workflow" terminology. Application tracking is the primary use case, but workflows are the generalized system.

---

## Current Status (Updated: Feb 6, 2026)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Foundation | ✅ **COMPLETE** | Auth, DB, basic Temporal setup done. Code rolled back to clean state. |
| Phase 2: Workflow Builder | ⚪ Not Started | Linear step-based builder for creating workflow definitions. |
| Phase 3: Core CRUD | ⚪ Not Started | Contacts + Workflow Executions (rebuilt with correct architecture). |
| Phase 4: Tasks & Kanban | ⚪ Not Started | |
| Phase 5: Dashboard & Reporting | ⚪ Not Started | |
| Phase 6: Workflow Orchestration | ⚪ Not Started | Temporal integration with generic workflow interpreter. |
| Phase 7: Polish & Launch Prep | ⚪ Not Started | |

**Next Steps:**
1. Phase 2: Build workflow definition builder UI
2. Phase 3: Rebuild CRUD with workflow_definitions and workflow_executions
3. Phase 6: Implement generic Temporal workflow interpreter

---

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
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

workflows
├── id
├── organization_id
├── contact_id (FK)
├── workflow_template_id (FK, nullable)
├── status
├── source (formstack, manual, etc.)
├── source_id (external reference)
├── submitted_at
├── metadata (JSONB)
├── created_at
├── updated_at

contacts
├── id
├── organization_id
├── first_name
├── last_name
├── email
├── phone
├── company
├── role
├── status (active, inactive, lead)
├── address_line_1
├── address_line_2
├── city
├── state
├── zip
├── avatar_url
├── last_contacted_at
├── tags (array)
├── metadata (JSONB)
├── created_at
├── updated_at

tasks
├── id
├── organization_id
├── workflow_id (FK, nullable)
├── contact_id (FK, nullable)
├── assigned_to (user_id)
├── title
├── description
├── status (todo, in_progress, done)
├── priority (low, medium, high)
├── position (for ordering)
├── due_date
├── completed_at
├── created_at
├── updated_at

workflow_templates
├── id
├── organization_id
├── name
├── description
├── statuses (JSONB array of status definitions for UI/badges)
├── is_active
├── created_at
├── updated_at

**Note:** `workflow_templates` stores UI metadata (status labels, colors, badge variants). Temporal handles actual workflow execution, state, and orchestration.

activity_log
├── id
├── organization_id
├── entity_type (workflow, contact, task)
├── entity_id
├── workflow_id (FK, nullable, indexed)
├── contact_id (FK, nullable, indexed)
├── task_id (FK, nullable, indexed)
├── user_id
├── action (created, updated, deleted, status_changed)
├── details (JSONB)
├── created_at

notes
├── id
├── organization_id
├── entity_type (workflow, contact, task)
├── entity_id
├── workflow_id (FK, nullable, indexed)
├── contact_id (FK, nullable, indexed)
├── task_id (FK, nullable, indexed)
├── user_id
├── content
├── is_internal
├── created_at

formstack_config
├── id
├── organization_id (unique)
├── webhook_secret
├── field_mappings (JSONB)
├── default_workflow_id (FK to workflow_templates)
├── is_active
├── created_at
├── updated_at

formstack_submissions
├── id
├── organization_id
├── form_id
├── submission_id (unique per org)
├── raw_payload (JSONB)
├── processed
├── workflow_id (FK, nullable)
├── error
├── created_at

users (sync from Clerk)
├── id (matches Clerk user ID)
├── organization_id
├── email
├── first_name
├── last_name
├── role
├── created_at
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

### Phase 2: Workflow Builder

**Workflow Definition UI**
- [ ] Workflow builder page (`/admin/workflow-builder`)
- [ ] List of workflow definitions (table)
- [ ] Create new workflow definition form (name, description)
- [ ] Edit workflow definition

**Step Builder UI**
- [ ] Linear step list component (vertical, draggable cards)
- [ ] Add step button with type selector
- [ ] Drag-and-drop reordering (dnd-kit)
- [ ] Step configuration panel (right sidebar or modal)
- [ ] Delete step functionality

**Step Type Components**
- [ ] Trigger step config (form_submission, manual)
- [ ] Assign Task step config (title, assignee role selector, description)
- [ ] Wait for Task step config (task reference, timeout)
- [ ] Send Email step config (to, subject, template)
- [ ] Update Status step config (status selector)
- [ ] Condition step config (field, branches with if/then)
- [ ] Update Contact step config (field mappings)

**Variable System**
- [ ] Variable templating UI (e.g., `{{contact.email}}`)
- [ ] Variable picker/autocomplete
- [ ] Variable definitions for workflow

**API & Database**
- [ ] Workflow definition API routes (CRUD)
- [ ] Save/load workflow definitions from DB
- [ ] Validate workflow definition structure

**Deliverable:** User can create, edit, and manage workflow definitions with linear steps

---

### Phase 3: Core CRUD

**Contacts**
- [ ] Contact list page (table with search/filter)
- [ ] Contact detail page
- [ ] Create contact form
- [ ] Edit contact
- [ ] Delete contact
- [ ] Contact API routes (GET, POST, PATCH, DELETE)

**Workflow Executions** *(instances of workflow definitions)*
- [ ] Workflow execution list page (table with filters)
- [ ] Workflow execution detail page
- [ ] Trigger workflow execution (manual trigger form)
- [ ] Link execution to contact
- [ ] Display current step in execution
- [ ] Workflow execution API routes (GET, POST, PATCH, DELETE)
- [ ] Execution status updates

**Deliverable:** User can manage contacts and trigger/view workflow executions

---

### Phase 4: Tasks & Kanban

**Task Management**
- [ ] Task list page (My Work page with table/kanban/grid views)
- [ ] Create task form
- [ ] Task detail dialog (view/edit)
- [ ] Assign task to user
- [ ] Due date picker
- [ ] Task status (todo, in_progress, done)
- [ ] Link task to workflow execution or contact

**Task API Routes**
- [ ] GET /api/tasks (list tasks, filter by assignee/status)
- [ ] POST /api/tasks (create task - manual or from workflow)
- [ ] GET /api/tasks/:id (get task details)
- [ ] PATCH /api/tasks/:id (update task fields)
- [ ] PATCH /api/tasks/:id/status (update status + conditional workflow signal)
- [ ] DELETE /api/tasks/:id (delete task)

**Task ↔ Workflow Integration**
- [ ] Task status update logic:
  - Update task in DB
  - Check if `workflow_execution_id` exists
  - If yes, send Temporal signal `taskStatusChanged`
  - Workflow resumes from `wait_for_task` step
- [ ] Standalone task support (no workflow signal if `workflow_execution_id` is null)
- [ ] Task creation from workflow steps (store `created_by_step_id`)

**Kanban Board**
- [ ] Kanban view component (GenericKanbanBoard - reusable for tasks and workflows)
- [ ] Drag-and-drop between columns
- [ ] Column = status
- [ ] Card = task with key info
- [ ] Drag updates task status (triggers API call with signaling)

**Deliverable:** User can create tasks, assign them, manage via Kanban, and tasks integrate with workflow executions

---

### Phase 5: Dashboard & Reporting

**Dashboard Widgets**
- [ ] Workflow count by status (pie/bar chart)
- [ ] Recent workflows list
- [ ] My tasks widget
- [ ] Workflows over time (line chart)

**Dashboard Page**
- [ ] Widget grid layout
- [ ] Date range filter (optional for MVP)

**Exports**
- [ ] CSV export for workflows
- [ ] CSV export for contacts
- [ ] Basic PDF report (workflow summary)

**Deliverable:** User sees pipeline overview, can export data

---

### Phase 6: Workflow Orchestration

**Temporal Workflows**
- [ ] Define applicant review workflow (lib/workflows/applicant-review.ts)
- [ ] Implement activities (DB operations in lib/activities/database.ts)
- [ ] Email sending activities (lib/activities/email.ts)
- [ ] External API integration activities (lib/activities/integrations.ts)
- [ ] Signal handling for task completion
- [ ] Signal handling for form submission
- [ ] Timeout/retry configuration
- [ ] Workflow templates CRUD (UI metadata only)

**Activity & Notes**
- [ ] Activity log on workflow detail
- [ ] Activity log on contact detail
- [ ] Add note to workflow/contact
- [ ] Activity feed widget on dashboard

**Deliverable:** Full audit trail, durable workflow orchestration with signal/wait patterns for external events

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

**Note:** These map to WorkflowStatus type. Status values come from workflow_templates table.

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

These features will be built after the core platform is proven and when specific customer needs arise:

### Formstack Integration

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

- [ ] Visual drag-and-drop workflow builder
- [ ] AI assistant
- [ ] Payment processing / Stripe
- [ ] Drag-and-drop PDF template designer
- [ ] Calendar integrations / scheduling
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
