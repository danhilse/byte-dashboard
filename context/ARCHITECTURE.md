# Byte Dashboard - System Architecture

**Date:** February 6, 2026
**Status:** Architecture Documentation

---

## Overview

Byte Dashboard is a **lightweight system for tracking people through multi-step processes**.

Unlike simple CRUD applications, it orchestrates long-running workflows that involve external integrations, async operations, and waiting for external events.

**Key Architectural Principle:** Workflows can span hours, days, or weeks while waiting for external responses (form submissions, task completions, webhooks), requiring durable execution and signal/wait patterns.

---

## System Components

### Frontend Layer
- **Technology:** Next.js 16 (App Router, React Server Components)
- **Deployment:** Vercel
- **Responsibilities:**
  - User interface and interactions
  - Data visualization (tables, kanban, dashboards)
  - Form submissions
  - Real-time UI updates via React Query

### API Layer
- **Technology:** Next.js API Routes
- **Deployment:** Vercel (Edge Functions)
- **Responsibilities:**
  - REST endpoints for CRUD operations
  - Webhook receivers (Formstack, etc.)
  - Temporal workflow triggers
  - Signal senders to running workflows

### Workflow Orchestration Layer
- **Technology:** Temporal.io (TypeScript SDK)
- **Deployment:** Railway (Temporal Workers)
- **Responsibilities:**
  - Durable workflow execution
  - Long-running processes (hours/days/weeks)
  - Signal/wait for external events
  - Automatic retries with backoff
  - Timeout handling
  - State persistence

### Database Layer
- **Technology:** PostgreSQL (Neon or Railway)
- **ORM:** Drizzle
- **Responsibilities:**
  - Business data (contacts, workflow executions, tasks)
  - Workflow definitions (blueprints with steps)
  - User data (synced from Clerk)
  - Activity logs
  - File metadata

### Authentication Layer
- **Technology:** Clerk
- **Responsibilities:**
  - User authentication
  - Multi-tenant organizations
  - Role-based access control
  - User management

### File Storage Layer
- **Technology:** Vercel Blob (v1) → Cloudflare R2 (future)
- **Responsibilities:**
  - Document uploads
  - Asset storage
  - File previews

---

## Data Flow: Workflow Execution Example

This diagram shows how an external form submission triggers a workflow execution that runs over multiple days:

**Example Use Case:** Applicant onboarding workflow (one example of many possible workflows)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         External Event                              │
│                    (Formstack Form Submission)                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Next.js API Route                               │
│                  /api/webhooks/formstack                            │
│                                                                     │
│  1. Verify webhook signature                                       │
│  2. Parse form data                                                │
│  3. Trigger Temporal workflow                                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Temporal Workflow Engine                         │
│              (lib/workflows/generic-workflow.ts)                    │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ Step 1: Create Contact (Activity: database.createContact) │   │
│  └──────────────────────────┬─────────────────────────────────┘   │
│                             │                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ Step 2: Create Workflow Execution (Activity: database... │   │
│  └──────────────────────────┬─────────────────────────────────┘   │
│                             │                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ Step 3: Send Email (Activity: email.sendNotification)     │   │
│  └──────────────────────────┬─────────────────────────────────┘   │
│                             │                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ Step 4: Create Review Task (Activity: database.createTask)│   │
│  └──────────────────────────┬─────────────────────────────────┘   │
│                             │                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ Step 5: WAIT FOR SIGNAL (taskCompleted)                   │   │
│  │         ⏳ Can wait hours, days, or weeks                  │   │
│  │         ⏰ Timeout after 7 days                            │   │
│  └──────────────────────────┬─────────────────────────────────┘   │
│                             │                                      │
│           ... workflow continues after signal received ...         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
           ▲                                   │
           │                                   │
           │ Signal                            ▼
           │                         More activities...
           │
┌──────────────────────────┐
│   User Action (UI)       │
│   "Complete Task"        │
│         │                │
│         ▼                │
│  POST /api/workflows/    │
│       signal             │
└──────────────────────────┘
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                            CLIENT BROWSER                           │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │           Next.js 16 Frontend (Vercel)                       │  │
│  │                                                              │  │
│  │  • React Server Components                                  │  │
│  │  • Client Components (forms, interactions)                  │  │
│  │  • TanStack React Query (state management)                  │  │
│  │  • shadcn/ui + Tailwind CSS                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       │ HTTPS
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      VERCEL EDGE NETWORK                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Next.js API Routes                              │  │
│  │                                                              │  │
│  │  • /api/contacts/* (CRUD)                                   │  │
│  │  • /api/workflow-executions/* (CRUD)                               │  │
│  │  • /api/webhooks/formstack (webhook receiver)               │  │
│  │  • /api/workflows/start (trigger workflows)                 │  │
│  │  • /api/workflows/signal (send signals)                     │  │
│  └──────┬───────────────────────────────────────┬───────────────┘  │
└─────────┼───────────────────────────────────────┼──────────────────┘
          │                                       │
          │ Drizzle ORM                           │ Temporal Client
          │                                       │
          ▼                                       ▼
┌─────────────────────────┐         ┌─────────────────────────────────┐
│   PostgreSQL (Neon)     │         │   Temporal.io (Railway)         │
│                         │         │                                 │
│  • contacts             │         │  ┌──────────────────────────┐   │
│  • workflow_executions         │         │  │  Temporal Workers        │   │
│  • tasks                │         │  │                          │   │
│  • workflow_templates   │         │  │  Execute workflows       │   │
│  • users                │         │  │  Run activities          │   │
│  • notes                │         │  │  Handle signals          │   │
│  • activity_log         │         │  └──────────────────────────┘   │
│  • formstack_*          │         │                                 │
│                         │         │  ┌──────────────────────────┐   │
│  (Application Data)     │         │  │  Temporal Server         │   │
└─────────────────────────┘         │  │                          │   │
                                    │  │  Workflow state          │   │
                                    │  │  Execution history       │   │
          ┌─────────────────────────┤  │  Timers & signals        │   │
          │                         │  │  Retry policies          │   │
          │ Activities              │  └──────────────────────────┘   │
          │ (DB, Email, APIs)       │                                 │
          ▼                         │  (Workflow Orchestration)       │
┌─────────────────────────┐         └─────────────────────────────────┘
│  External Services      │
│                         │
│  • Email (SendGrid)     │
│  • Background Checks    │
│  • Formstack Forms      │
│  • Other APIs           │
└─────────────────────────┘

┌─────────────────────────┐
│   Clerk (Auth)          │
│                         │
│  • Organizations        │
│  • Users                │
│  • Roles                │
│  • Sessions             │
└─────────────────────────┘

┌─────────────────────────┐
│  File Storage           │
│  (Vercel Blob → R2)     │
│                         │
│  • Document uploads     │
│  • Asset storage        │
└─────────────────────────┘
```

---

## Workflow Execution: Sequence Diagram

This shows a multi-day application review workflow with signal/wait patterns:

```
User         Frontend      API Route     Temporal       Activities    Database    Email
 │              │              │            │               │            │          │
 │ Submit Form  │              │            │               │            │          │
 ├─────────────>│              │            │               │            │          │
 │              │ POST /api/   │            │               │            │          │
 │              │  webhooks    │            │               │            │          │
 │              ├─────────────>│            │               │            │          │
 │              │              │ Start      │               │            │          │
 │              │              │ Workflow   │               │            │          │
 │              │              ├───────────>│               │            │          │
 │              │              │            │ createContact │            │          │
 │              │              │            ├──────────────>│            │          │
 │              │              │            │               │ INSERT     │          │
 │              │              │            │               ├───────────>│          │
 │              │              │            │               │<───────────┤          │
 │              │              │            │<──────────────┤            │          │
 │              │              │            │               │            │          │
 │              │              │            │ createWorkflowExecution          │          │
 │              │              │            ├──────────────>│            │          │
 │              │              │            │               │ INSERT     │          │
 │              │              │            │               ├───────────>│          │
 │              │              │            │<──────────────┤            │          │
 │              │              │            │               │            │          │
 │              │              │            │ sendEmail     │            │          │
 │              │              │            ├──────────────>│            │          │
 │              │              │            │               │ Send Email │          │
 │              │              │            │               ├────────────┼─────────>│
 │              │              │            │<──────────────┤            │          │
 │              │              │            │               │            │          │
 │              │              │            │ createTask    │            │          │
 │              │              │            ├──────────────>│            │          │
 │              │              │            │               │ INSERT     │          │
 │              │              │            │               ├───────────>│          │
 │              │              │            │<──────────────┤            │          │
 │              │              │            │               │            │          │
 │              │              │            │ WAIT FOR      │            │          │
 │              │              │            │ SIGNAL        │            │          │
 │              │              │            │ (days pass)   │            │          │
 │              │              │            │ ⏳⏳⏳        │            │          │
 │              │              │            │               │            │          │
 │ Complete Task│              │            │               │            │          │
 ├─────────────>│              │            │               │            │          │
 │              │ POST /api/   │            │               │            │          │
 │              │ workflows/   │            │               │            │          │
 │              │ signal       │            │               │            │          │
 │              ├─────────────>│            │               │            │          │
 │              │              │ Send Signal│               │            │          │
 │              │              ├───────────>│               │            │          │
 │              │              │            │ (resumes)     │            │          │
 │              │              │            │               │            │          │
 │              │              │            │ sendBackgroundCheck        │          │
 │              │              │            ├──────────────>│            │          │
 │              │              │            │               │ Send Email │          │
 │              │              │            │               ├────────────┼─────────>│
 │              │              │            │<──────────────┤            │          │
 │              │              │            │               │            │          │
 │              │              │            │ WAIT FOR      │            │          │
 │              │              │            │ SIGNAL        │            │          │
 │              │              │            │ (more days)   │            │          │
 │              │              │            │ ⏳⏳⏳        │            │          │
 │              │              │            │               │            │          │
 │              │    ... workflow continues ...              │            │          │
```

---

## Why Temporal Over Simple Alternatives?

### The Problem with Simple API Routes

**Scenario:** Application review workflow
1. Create application
2. Send email to hiring manager
3. **Wait for hiring manager to complete review** (could be days)
4. Send background check form to applicant
5. **Wait for applicant to submit form** (could be weeks)
6. Call external background check API
7. Schedule interview

**API Route Limitations:**
- ❌ **Stateless**: Can't "pause" and wait for external events
- ❌ **No durability**: Server restart loses in-progress workflows
- ❌ **Manual retries**: Must write custom retry logic for every step
- ❌ **No timeouts**: Can't automatically timeout after 7 days
- ❌ **Complex state**: Must manually track workflow state in DB

**Workarounds (all flawed):**
- Polling: Inefficient, delays, resource waste
- Webhooks only: No way to wait/resume, complex state management
- Cron jobs: Poor granularity, complex state tracking
- Queue systems: Lose context between steps, hard to debug

### Temporal's Solution

✅ **Durable Execution**: Workflows survive server restarts
✅ **Signal/Wait Patterns**: Pause for external events, resume automatically
✅ **Automatic Retries**: Configurable backoff, exponential retry
✅ **Timeout Handling**: Built-in timeout for waits
✅ **State Management**: Temporal tracks workflow state automatically
✅ **Debugging**: Full execution history, replay failed workflows
✅ **TypeScript SDK**: Full type safety, integrates with Next.js

**Industry Validation:**
- Netflix: Content encoding pipelines
- Stripe: Payment processing
- Snap: Infrastructure automation
- Datadog: Monitoring workflows

---

## Folder Structure

```
frontend/
├── app/
│   ├── (dashboard)/               # Frontend pages
│   │   ├── dashboard/
│   │   ├── applications/
│   │   ├── people/
│   │   ├── tasks/
│   │   └── admin/
│   │       └── settings/
│   └── api/                       # Next.js API routes
│       ├── webhooks/
│       │   └── formstack/
│       ├── workflows/
│       │   ├── start/
│       │   └── signal/
│       ├── contacts/
│       ├── applications/
│       └── tasks/
├── lib/
│   ├── db/                        # Database (Drizzle)
│   │   ├── index.ts               # Connection
│   │   ├── schema.ts              # Tables
│   │   └── queries.ts             # Reusable queries
│   ├── workflows/                 # Temporal workflows
│   │   ├── onboarding-workflow.ts
│   │   ├── background-check.ts
│   │   └── onboarding.ts
│   ├── activities/                # Temporal activities
│   │   ├── database.ts            # DB operations
│   │   ├── email.ts               # Email sending
│   │   └── integrations.ts        # External APIs
│   ├── temporal/                  # Temporal setup
│   │   ├── client.ts              # Temporal client
│   │   └── worker.ts              # Temporal worker
│   └── validations/               # Zod schemas
└── types/
    └── index.ts                   # TypeScript types
```

---

## Data Flow Patterns

### Pattern 1: CRUD Operations (Simple)
```
Frontend → API Route → Database → Response → Frontend
```
Example: View contact list, update task status

### Pattern 2: Webhook → Workflow (Complex)
```
External System → Webhook API → Start Workflow → Activities → Database/APIs
                                      ↓
                              Wait for Signal (hours/days)
                                      ↓
                              More Activities
```
Example: Formstack form submission triggers application review workflow

### Pattern 3: User Action → Signal Workflow (Complex)
```
Frontend → API Route → Send Signal to Workflow → Workflow Resumes → Activities
```
Example: User completes task, signals workflow to continue to next step

### Pattern 4: Task Status Update → Conditional Workflow Signal

**Flow: Task Completion Signals Workflow**
```
User marks task done
  ↓
PATCH /api/tasks/:id/status { status: "done" }
  ↓
Update task in DB (set status, completed_at)
  ↓
Check: Does task.workflow_execution_id exist?
  ↓ YES
Check: Does task.created_by_step_id exist?
  ↓ YES
Get workflow execution from DB
  ↓
Send Temporal signal: taskStatusChanged
  {
    taskId: string,
    stepId: string,
    newStatus: string,
    completedAt: timestamp
  }
  ↓
Workflow waiting on wait_for_task step receives signal
  ↓
Workflow validates signal matches expected task
  ↓
Workflow continues to next step
```

**Key Points:**
- Not all task status changes signal workflows (only if task belongs to a workflow)
- Tasks can be standalone (workflow_execution_id = null)
- Signal includes step_id so workflow knows which task completed

### Pattern 5: Workflow Status Change → Task Creation

**Flow: Workflow Triggers Task Creation**
```
Workflow reaches update_status step
  ↓
Activity: Update workflow_executions.status = "approved"
  ↓
Workflow continues to next step
  ↓
Next step: assign_task (may be conditional on status)
  ↓
Activity: Create task in DB
  {
    workflow_execution_id: execution.id,
    created_by_step_id: "step_5",
    assigned_to: "role:hr",
    title: "Complete background check"
  }
  ↓
Task appears in assignee's "My Work" page
```

**Key Points:**
- Workflow status changes can trigger subsequent steps
- Steps can be conditional based on execution status
- Tasks created by workflows are linked via workflow_execution_id

### Pattern 6: Workflow Updates Existing Task

**Flow: Workflow Modifies Task**
```
Workflow reaches update_task step
  ↓
Activity: Query task created by step_2
  ↓
Activity: Update task fields
  {
    priority: "high",
    due_date: new Date(),
    metadata: { urgency: "critical" }
  }
  ↓
Task updates reflected in UI
```

**Key Points:**
- update_task step can reference tasks from previous steps
- Can update priority, due date, assignee, metadata
- Does not signal workflow (workflow is already running)

---

## Workflow Builder Architecture

### Linear Step-Based Builder

**UI Concept:** Vertical list of draggable step cards (not a node-based graph)

```
┌─────────────────────────────────────┐
│ Applicant Onboarding Workflow       │
├─────────────────────────────────────┤
│  1. [≡] Form Submitted          [⚙] │
│  2. [≡] Assign Review Task      [⚙] │
│  3. [≡] Wait for Review         [⚙] │
│  4. [≡] Check Outcome           [⚙] │
│     ├─ If approved → Step 5         │
│     └─ If rejected → Step 8         │
│  5. [≡] Send Approval Email     [⚙] │
│  6. [≡] Update Status           [⚙] │
│  [+ Add Step]                       │
└─────────────────────────────────────┘
```

**Features:**
- Drag to reorder steps
- Click gear icon to edit step configuration
- Simple conditional branching (if/then within steps)
- Variable templating (e.g., `{{contact.email}}`, `{{task.outcome}}`)

### Step Types

| Type | Purpose | Configuration | Signals? |
|------|---------|---------------|----------|
| `trigger` | Start the workflow | Trigger type (form_submission, manual, etc.) | Entry point |
| `assign_task` | Create and assign task | Title, assignee, description | No |
| `wait_for_task` | Wait for task completion | Task ref, timeout | Receives signal |
| `update_task` | Modify existing task | Task ref, field updates | No |
| `complete_task` | Auto-complete task | Task ref | Optional signal |
| `update_contact` | Update contact fields | Field mappings | No |
| `update_status` | Change execution status | Status value (can trigger subsequent steps) | No |
| `set_due_date` | Set task/execution due date | Date expression | No |
| `send_email` | Send email | To, subject, template | No |
| `reminder` | Schedule reminder | Delay, message | No |
| `delay` | Wait X days/hours | Duration | No |
| `condition` | Branch based on value | Field, branches | No |
| `wait_for_signal` | Generic wait for any signal | Signal name, timeout | Receives signal |

### Step Configuration Examples

**assign_task:**
```json
{
  "id": "step_2",
  "type": "assign_task",
  "name": "Assign Review Task",
  "config": {
    "title": "Review {{contact.first_name}}'s Application",
    "description": "Review submitted application and approve/reject",
    "assign_to": "role:admin",
    "priority": "medium",
    "due_date": "{{now + 3 days}}"
  }
}
```

**wait_for_task:**
```json
{
  "id": "step_3",
  "type": "wait_for_task",
  "name": "Wait for Review",
  "config": {
    "task_from_step": "step_2",
    "timeout_days": 7,
    "on_timeout": "send_reminder"
  }
}
```

**update_task:**
```json
{
  "id": "step_7",
  "type": "update_task",
  "name": "Mark Task Urgent",
  "config": {
    "task_from_step": "step_2",
    "updates": {
      "priority": "high",
      "due_date": "{{now + 1 day}}",
      "metadata": { "urgency": "critical" }
    }
  }
}
```

**update_status:**
```json
{
  "id": "step_5",
  "type": "update_status",
  "name": "Mark as Approved",
  "config": {
    "status": "approved"
  }
}
```

**condition:**
```json
{
  "id": "step_4",
  "type": "condition",
  "name": "Check Review Outcome",
  "config": {
    "field": "{{step_3.task.metadata.outcome}}",
    "branches": [
      { "if": "approved", "then_goto": "step_5" },
      { "if": "rejected", "then_goto": "step_8" }
    ],
    "default": "step_5"
  }
}
```

### Execution Flow

1. **User creates workflow definition** via builder UI
2. **Definition saved** to `workflow_definitions.steps` (JSONB)
3. **User triggers execution** (form submission, manual, API)
4. **Generic Temporal workflow** reads definition and executes steps in order
5. **Conditional branching** handled by evaluating `condition` steps
6. **Current step tracked** in `workflow_executions.current_step_id`

### Temporal Integration

**Generic Workflow Interpreter** (`lib/workflows/generic-workflow.ts`):
```typescript
export async function executeWorkflow(definitionId: string, variables: Record<string, any>) {
  const definition = await getWorkflowDefinition(definitionId);
  const steps = definition.steps.steps; // JSONB array

  for (const step of steps.sort((a, b) => a.order - b.order)) {
    await executeStep(step, variables);

    // Handle conditional branching
    if (step.type === 'condition') {
      const nextStep = evaluateCondition(step, variables);
      // Jump to next step based on condition
    }
  }
}
```

---

## Deployment Architecture

### Development
- **Frontend**: Next.js dev server (localhost:3000)
- **Database**: Neon (serverless Postgres)
- **Temporal**: Local Temporal server (via Docker) or Temporal Cloud dev environment
- **Worker**: Node process running locally (`npm run temporal:worker`)

### Production

#### Recommended for MVP: Temporal Cloud
- **Frontend**: Vercel (automatic deployment on git push)
- **API Routes**: Vercel Edge Functions
- **Database**: Neon (production instance, ~$25/month)
- **Temporal**: **Temporal Cloud** (~$200/month after free tier)
- **Worker**: Railway deployment (~$10-20/month)
  - Runs `lib/temporal/worker.ts`
  - Connects to Temporal Cloud
  - Executes workflows and activities
  - Auto-scales based on workflow load

**Why Temporal Cloud for MVP:**
- ✅ No operational overhead (upgrades, backups, DR, observability)
- ✅ Built-in monitoring and debugging UI
- ✅ Automatic scaling
- ✅ Free tier for development
- ✅ Ship faster, worry about ops later

**Cost breakdown (MVP):**
- Vercel: Free (hobby tier sufficient)
- Neon: $25/month
- Temporal Cloud: $0-200/month (free tier → paid as you scale)
- Railway (workers): $10-20/month
- **Total: ~$35-245/month** depending on usage

#### Alternative: Self-Hosted (Post-MVP Only)
**Option B: Temporal Server on Railway**
- **Pros**: Lower cash costs (~$50/month total: Railway + Postgres)
- **Cons**: You now own:
  - Temporal server upgrades
  - Backup/disaster recovery
  - Observability setup (metrics, logs, traces)
  - Incident response (3am Temporal crashes)
  - Scaling tuning

**Recommendation:** Use Temporal Cloud for MVP. Self-host only if:
1. You've shipped v1 and have real users
2. You have ops bandwidth for 24/7 availability
3. Cost > $500/month justifies the eng time

**MVP discipline:** Pay for managed services now, optimize costs after product-market fit.

---

## Security Considerations

1. **Multi-Tenant Isolation**
   - All data scoped by `org_id` (Clerk organization ID)
   - Row-level security in database queries
   - Temporal workflows isolated by namespace

2. **Authentication**
   - Clerk handles auth, sessions, tokens
   - API routes verify Clerk session
   - Temporal workers use API keys (not user sessions)

3. **Webhook Security**
   - Signature verification (Formstack, other webhooks)
   - Rate limiting on webhook endpoints
   - Replay attack prevention

4. **Workflow Security**
   - Workflows run in isolated namespaces
   - Activities validate org_id before DB operations
   - Sensitive data encrypted at rest

---

## Performance Considerations

1. **Workflow Efficiency**
   - Activities are retryable, workflows are not
   - Keep workflows deterministic (no I/O)
   - Use activities for all external operations

2. **Database Optimization**
   - Indexes on `org_id`, `status`, `assigned_to`
   - Avoid N+1 queries with Drizzle joins
   - React Query caching reduces DB load

3. **Temporal Optimization**
   - Workers auto-scale based on load
   - Use workflow query for read-only operations
   - Batch operations in activities

---

## Critical Invariants

### UI Status ≠ Execution State

**The Rule:** `workflows.status` is presentation-only. Temporal workflow state is the authoritative source of progression.

**Why This Matters:**
If you allow users to freely change `workflows.status` without signaling Temporal, you'll desync reality in week one. The UI will show "Interview Scheduled" while the Temporal workflow is still waiting for background check completion.

**Enforcement:**

1. **UI Status Changes Must:**
   - Signal Temporal workflow to progress (e.g., `POST /api/workflows/{id}/signal`)
   - Or be derived from Temporal workflow outcomes (e.g., workflow completes → set status to "approved")

2. **Never Allow:**
   - Direct status updates via `UPDATE workflows SET status = ?` without workflow coordination
   - Status dropdowns that bypass Temporal signals

3. **Implementation Pattern:**
```typescript
// ❌ WRONG: Direct status update
async function updateStatus(workflowId: string, newStatus: string) {
  await db.workflows.update({ id: workflowId }, { status: newStatus });
}

// ✅ CORRECT: Signal Temporal, then update UI state
async function updateStatus(workflowId: string, newStatus: string, signal: object) {
  // Signal the workflow
  await temporalClient.workflow.signalWithStart(workflowId, {
    signal: 'statusChange',
    args: [signal]
  });

  // Temporal workflow activity updates DB status as side effect
  // UI polls or subscribes to status changes
}
```

4. **Status Sources:**
   - **Display Status:** `workflows.status` (read from DB, updated by Temporal activities)
   - **Execution State:** Temporal workflow history (query via Temporal client if needed)
   - **Status Badge/Color:** `workflow_templates.statuses` JSONB (UI metadata only)

**Result:** Temporal workflow state is always authoritative. UI status is a cached presentation layer updated by Temporal activities.

---

## Key Design Decisions

### 1. Temporal for Workflows (Not Simple State Machines)
**Decision:** Use Temporal.io for all multi-step workflows
**Rationale:** Workflows require long-running execution, signal/wait patterns, and durability
**Alternative Rejected:** Simple status transitions (can't wait for external events)

### 2. PostgreSQL for Business Data (Not Temporal)
**Decision:** Store contacts, workflow executions, tasks in PostgreSQL
**Rationale:** Temporal is for execution state, not business data
**Temporal Stores:** Workflow history, timers, signals, execution state
**PostgreSQL Stores:** Contacts, workflow executions, tasks, notes, audit logs, workflow definitions

### 3. Workflow Definitions in JSONB (Not Separate Tables)
**Decision:** `workflow_definitions.steps` stores linear workflow steps as JSONB
**Rationale:** Simple linear builder doesn't need complex normalized schema
**Alternative Rejected:** 16-table workflow builder (over-engineered for MVP)

**Step Structure:**
```json
{
  "steps": [
    {"id": "step_1", "order": 1, "type": "trigger", "name": "Form Submitted", "config": {...}},
    {"id": "step_2", "order": 2, "type": "assign_task", "name": "Assign Review", "config": {...}},
    {"id": "step_3", "order": 3, "type": "wait_for_task", "name": "Wait for Review", "config": {...}}
  ]
}
```

### 4. Next.js API Routes for Triggers (Not Direct Temporal Calls)
**Decision:** Frontend triggers workflows via API routes, not Temporal client directly
**Rationale:** Security, validation, logging, org isolation
**Flow:** Frontend → API Route → Temporal Client → Start Workflow

### 5. Clerk for Auth (Not Custom Auth)
**Decision:** Use Clerk for authentication and organizations
**Rationale:** Multi-tenant built-in, no auth tables, faster MVP
**Alternative Rejected:** Custom auth system (adds weeks to timeline)

---

## Future Enhancements

### Phase 2: Advanced Features
- Visual workflow builder (drag-and-drop)
- Email notifications system
- Calendar integrations (Google/Outlook)
- Advanced integrations (Mailchimp, SendGrid)
- Real-time collaboration

### Phase 3: Scale & Optimization
- Worker auto-scaling
- Database read replicas
- Workflow versioning
- A/B testing workflows
- Advanced analytics

---

## References

- [Temporal Documentation](https://docs.temporal.io)
- [Next.js App Router](https://nextjs.org/docs)
- [Clerk Multi-Tenant Guide](https://clerk.com/docs/organizations)
- [Drizzle ORM](https://orm.drizzle.team/)
- [v1.md](../v1.md) - Product vision and requirements
- [CLAUDE.md](../CLAUDE.md) - Developer guide
- [MVP_ROADMAP.md](./MVP_ROADMAP.md) - Implementation phases
