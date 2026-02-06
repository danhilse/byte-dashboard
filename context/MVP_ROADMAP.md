# MVP Roadmap: Byte Dashboard Rebuild

**Goal:** Build a lightweight system for tracking people through multi-step processes.

**Primary Use Case:** Applicant onboarding and tracking for Fayette County Sheriff's Office.

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
| Deployment | Vercel (frontend) + Railway (backend/workers) |

**Note:** API routes handle both Next.js endpoints and Temporal worker processes.

---

## Data Model

Core entities (~10 tables):

**Note:** This schema is for application data only. Temporal.io maintains its own persistence layer for workflow execution state, history, timers, and signals.

```
organizations (via Clerk - no table needed)
├── users (via Clerk - synced to local table for app data)

applications
├── id
├── organization_id
├── contact_id (FK)
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
├── address_line_1
├── address_line_2
├── city
├── state
├── zip
├── created_at
├── updated_at

tasks
├── id
├── organization_id
├── application_id (FK, nullable)
├── contact_id (FK, nullable)
├── assigned_to (user_id)
├── title
├── description
├── status (todo, in_progress, done)
├── due_date
├── created_at
├── updated_at

workflow_templates
├── id
├── organization_id
├── name
├── statuses (JSONB array of status definitions for UI/badges)
├── created_at

**Note:** `workflow_templates` stores UI metadata (status labels, colors, badge variants). Temporal handles actual workflow execution, state, and orchestration.

activity_log
├── id
├── organization_id
├── entity_type (application, contact, task)
├── entity_id
├── user_id
├── action (created, updated, status_changed, note_added)
├── details (JSONB)
├── created_at

notes
├── id
├── organization_id
├── entity_type
├── entity_id
├── user_id
├── content
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

### Phase 1: Foundation

**Auth & Multi-tenant Setup**
- [ ] Next.js project scaffold
- [ ] Clerk integration
- [ ] Clerk Organizations enabled
- [ ] Middleware for org-scoped routes
- [ ] User sync webhook (Clerk → local users table)
- [ ] Role-based access (Owner, Admin, User)

**Database & ORM**
- [ ] Railway/Neon Postgres provisioned
- [ ] Drizzle schema setup
- [ ] Initial migrations
- [ ] Database connection utilities

**Temporal Setup**
- [ ] Install @temporalio/client and @temporalio/worker
- [ ] Configure Temporal connection (local dev or Temporal Cloud)
- [ ] Set up worker process
- [ ] Create first simple workflow (hello world)
- [ ] Test workflow execution and signal handling

**UI Foundation**
- [ ] Tailwind config
- [ ] shadcn/ui components installed
- [ ] Layout components (sidebar, header, page container)
- [ ] Basic navigation

**Deliverable:** User can sign up, create org, see empty dashboard. Temporal workflows execute successfully.

---

### Phase 2: Core CRUD

**Contacts**
- [ ] Contact list page (table with search/filter)
- [ ] Contact detail page
- [ ] Create contact form
- [ ] Edit contact
- [ ] Delete contact

**Applications**
- [ ] Application list page (table with filters)
- [ ] Application detail page
- [ ] Create application (manual)
- [ ] Edit application
- [ ] Status field with dropdown
- [ ] Link application to contact

**Deliverable:** User can manually create and manage contacts and applications

---

### Phase 3: Tasks & Kanban

**Task Management**
- [ ] Task list page
- [ ] Create task form
- [ ] Assign task to user
- [ ] Due date picker
- [ ] Task status (todo, in_progress, done)
- [ ] Link task to application or contact

**Kanban Board**
- [ ] Kanban view component
- [ ] Drag-and-drop between columns
- [ ] Column = status
- [ ] Card = task with key info

**Deliverable:** User can create tasks, assign them, and manage via Kanban

---

### Phase 4: Formstack Integration

**Webhook Ingestion**
- [ ] API route for Formstack webhook
- [ ] Webhook signature verification
- [ ] Field mapping config (Formstack fields → app fields)
- [ ] Temporal workflow triggered by webhook (not direct DB writes)
- [ ] Workflow orchestrates: create contact → create application → send notifications → create tasks
- [ ] Log ingestion in activity_log

**Admin Config**
- [ ] Settings page for Formstack integration
- [ ] Field mapping UI (or config file for MVP)

**Deliverable:** Applications auto-created via Temporal workflow when Formstack forms submitted. Workflow handles retries and error recovery.

---

### Phase 5: Dashboard & Reporting

**Dashboard Widgets**
- [ ] Application count by status (pie/bar chart)
- [ ] Recent applications list
- [ ] My tasks widget
- [ ] Applications over time (line chart)

**Dashboard Page**
- [ ] Widget grid layout
- [ ] Date range filter (optional for MVP)

**Exports**
- [ ] CSV export for applications
- [ ] CSV export for contacts
- [ ] Basic PDF report (application summary)

**Deliverable:** User sees pipeline overview, can export data

---

### Phase 6: Workflow Orchestration

**Temporal Workflows**
- [ ] Define application review workflow (lib/workflows/application-review.ts)
- [ ] Implement activities (DB operations in lib/activities/database.ts)
- [ ] Email sending activities (lib/activities/email.ts)
- [ ] External API integration activities (lib/activities/integrations.ts)
- [ ] Signal handling for task completion
- [ ] Signal handling for form submission
- [ ] Timeout/retry configuration
- [ ] Workflow templates CRUD (UI metadata only)

**Activity & Notes**
- [ ] Activity log on application detail
- [ ] Activity log on contact detail
- [ ] Add note to application/contact
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

### Application Statuses (Default)

Configurable per org, but sensible defaults:

```
1. Submitted
2. Under Review
3. Background Check
4. Interview Scheduled
5. Interview Complete
6. Approved
7. Rejected
8. On Hold
```

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

Field mapping config maps Field IDs to contact/application fields.

---

## Not in MVP (Backlog)

These are explicitly deferred:

- [ ] Visual drag-and-drop workflow builder
- [ ] AI assistant
- [ ] Payment processing / Stripe
- [ ] Drag-and-drop PDF template designer
- [ ] Calendar integrations / scheduling
- [ ] Advanced integrations (Mailchimp, SendGrid, etc.)
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
| Application fields | `src/pages/Applications.tsx` |
| Contact fields | `src/components/contact/ContactProfile.tsx` |
| Formstack mapping | `supabase/functions/formstack*/` |

---

## Success Criteria

MVP is complete when:

1. New org can sign up via Clerk
2. Formstack webhook creates applications automatically
3. Users can view/manage applications and contacts
4. Tasks can be created, assigned, and tracked via Kanban
5. Dashboard shows pipeline overview
6. Data can be exported to CSV
7. All data is properly scoped to organization
8. No cross-tenant data leakage

---

## Open Questions

Resolve before/during build:

1. **Formstack account access** - Need credentials and form IDs to test integration
2. **Existing data migration** - Any real data in old system that needs migration?
3. **Specific fields required** - Get final list of contact/application fields from FCSO
4. **Status workflow specifics** - Confirm the exact stages for their process
5. **User list** - Who needs accounts for initial pilot?
6. **Compliance requirements** - Any specific security certifications needed at launch?
