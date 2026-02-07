# Finalized Architecture: Simplified Motion Competitor

**Date:** February 6, 2026
**Goal:** Build a simplified Site Stacker Motion competitor focusing on the 80% use case

---

## Executive Summary

Byte Dashboard will provide an intuitive, self-serve workflow automation platform that simplifies the core functionality of Site Stacker Motion while removing the complexity that requires consultants.

**Key Differentiators:**
- ✅ Self-serve workflow builder (no consultant required)
- ✅ Linear step-based UI (not complex graph)
- ✅ Simple role-based assignment
- ✅ Visual phase grouping
- ✅ Built-in approval patterns
- ✅ 10x simpler than Motion, covers 80% of use cases

---

## Core Concepts

### 1. Roles

**Purpose:** Define who can perform tasks in workflows

**Implementation:**
- Simple role strings stored in Clerk user metadata
- Predefined system roles: `admin`, `reviewer`, `hr`, `manager`
- Custom roles can be added per organization
- One assignee per task (no many-to-many complexity)

**Task Assignment Options:**
```typescript
type TaskAssignment =
  | { type: 'user', user_id: string }           // Specific user
  | { type: 'role', role: string }              // Any user with role
  | { type: 'contact_field', field: string }    // e.g., contact's assigned_coach
```

**Examples:**
- Assign to role: "admin" → any admin can claim/complete
- Assign to user: "john@example.com" → specific person
- Assign to contact's coach → relationship-based (simple)

---

### 2. Phases (Landmarks)

**Purpose:** Group related steps into visual milestones

**Implementation:**
- Phases are optional visual grouping in workflow definitions
- Steps belong to phases but execute linearly
- Phases display progress in UI (e.g., "Phase 2 of 4: Background Check")
- **No complex phase-level triggers (keep it simple)**

**Critical Invariant: Phases are Visual Only**
- Phases do NOT control execution flow
- Phases do NOT have their own completion logic
- Steps execute sequentially regardless of phase boundaries
- Phase transitions happen automatically as steps complete

**Structure:**
```typescript
interface WorkflowPhase {
  id: string;
  name: string;              // "Initial Review"
  description?: string;
  order: number;
  steps: string[];           // Array of step IDs in this phase
}
```

**Example Workflow:**
```
Phase 1: Application Review
  └─ Step 1: Assign Review Task
  └─ Step 2: Wait for Review
  └─ Step 3: Check Outcome

Phase 2: Background Check
  └─ Step 4: Request Background Check
  └─ Step 5: Wait for Completion

Phase 3: Final Approval
  └─ Step 6: Manager Approval
  └─ Step 7: Send Approval Email
```

---

### 3. Step Types (Simplified Motion Tasks + Triggers)

**Core Step Types:**

| Type | Purpose | Assignment | Signals? |
|------|---------|-----------|----------|
| `trigger` | Start workflow | N/A | Entry point |
| `assign_task` | Create task | Role/User | No |
| `wait_for_task` | Wait for completion | N/A | Receives signal |
| `wait_for_approval` | Approve/Reject pattern | Role/User | Receives signal |
| `update_task` | Modify task | N/A | No |
| `update_contact` | Update contact fields | N/A | No |
| `update_status` | Change execution status | N/A | No |
| `send_email` | Send notification | N/A | No |
| `condition` | Simple branching | N/A | No |
| `delay` | Wait X days | N/A | No |

**New: wait_for_approval Step Type**

Simplified approval pattern (no complex form needed):

```json
{
  "id": "step_4",
  "type": "wait_for_approval",
  "name": "Manager Approval",
  "config": {
    "title": "Review Application for {{contact.name}}",
    "description": "Review and approve or reject this application",
    "assign_to": { "type": "role", "role": "manager" },
    "due_days": 3,
    "approval_options": {
      "approve_label": "Approve Application",
      "reject_label": "Reject Application",
      "require_comment": true
    }
  }
}
```

**What happens:**
1. Workflow creates approval task
2. Assigned user sees "Approve" / "Reject" buttons
3. User clicks button (optionally adds comment)
4. API updates task with outcome + comment
5. API signals workflow
6. Workflow continues based on outcome

**Branching after approval:**
```json
{
  "id": "step_5",
  "type": "condition",
  "name": "Check Approval",
  "config": {
    "field": "{{step_4.outcome}}",
    "branches": [
      { "if": "approved", "then_goto": "step_6" },
      { "if": "rejected", "then_goto": "step_9" }
    ]
  }
}
```

---

### 4. Conditional Logic (Keep Simple)

**Simple branching only - no complex field operators**

**Basic Pattern:**
```json
{
  "type": "condition",
  "config": {
    "field": "{{variable_name}}",
    "branches": [
      { "if": "value1", "then_goto": "step_id_1" },
      { "if": "value2", "then_goto": "step_id_2" }
    ],
    "default": "step_id_3"  // Optional fallback
  }
}
```

**Supported Variables:**
- `{{step_X.outcome}}` - Outcome from approval/task
- `{{step_X.task.status}}` - Task status
- `{{contact.field_name}}` - Contact field value
- `{{execution.status}}` - Current execution status

**Examples:**
```json
// Branch on approval outcome
{ "field": "{{step_2.outcome}}", "if": "approved", "then_goto": "step_3" }

// Branch on contact country
{ "field": "{{contact.country}}", "if": "USA", "then_goto": "step_5" }

// Branch on execution status
{ "field": "{{execution.status}}", "if": "pending_review", "then_goto": "step_4" }
```

**NOT Supported (too complex for MVP):**
- Multi-condition AND/OR logic
- Operators (>=, <=, contains, in)
- Field-level comparisons

---

## Critical Architectural Invariants

### Invariant 1: Workflow Status is Presentation-Only

The `workflow_executions.status` field is **for UI display only**. Temporal workflow state is authoritative.

**Rules:**
1. UI status changes must signal Temporal (not direct DB updates)
2. Status updates are derived from Temporal workflow outcomes
3. Never allow status dropdowns that bypass Temporal signals

**Example:**
```typescript
// ❌ WRONG: Direct status update
UPDATE workflow_executions SET status = 'approved' WHERE id = ?;

// ✅ CORRECT: Signal Temporal, workflow activity updates status
await temporalClient.workflow.signal(workflowId, 'approve', { reason: '...' });
// Temporal workflow activity updates workflow_executions.status as side effect
```

This prevents desyncing UI state from actual workflow progression.

### Invariant 2: Task Signaling is Conditional

Tasks only signal workflows when linked to a workflow execution.

**Rules:**
1. Check if `task.workflow_execution_id` exists before signaling
2. Standalone tasks (no workflow_execution_id) don't signal Temporal
3. Task status updates always update DB first, signal second

**Example:**
```typescript
// Task status update flow
async function updateTaskStatus(taskId: string, status: string) {
  // 1. Update task in DB
  const task = await db.update(tasks)
    .set({ status, completed_at: status === 'done' ? new Date() : null })
    .where(eq(tasks.id, taskId))
    .returning();

  // 2. Conditionally signal workflow
  if (task.workflow_execution_id) {
    await temporalClient.workflow.signal(
      task.workflow_execution_id,
      'taskStatusChanged',
      { taskId, status }
    );
  }

  return task;
}
```

### Invariant 3: Phases Don't Control Execution

Phases are for UI organization only. They don't affect workflow logic.

**Rules:**
1. Phases group steps visually but don't control flow
2. Steps execute sequentially regardless of phase boundaries
3. Phase progress is derived from completed steps, not managed separately

---

## Updated Data Model

### workflow_definitions Table

```sql
CREATE TABLE workflow_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  phases          JSONB DEFAULT '[]',      -- NEW: Array of phase definitions
  steps           JSONB NOT NULL DEFAULT '{"steps": []}',
  variables       JSONB DEFAULT '{}',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**phases JSONB structure:**
```json
{
  "phases": [
    {
      "id": "phase_1",
      "name": "Initial Review",
      "description": "Review application and assign tasks",
      "order": 1,
      "step_ids": ["step_1", "step_2", "step_3"]
    },
    {
      "id": "phase_2",
      "name": "Background Check",
      "description": "Conduct background verification",
      "order": 2,
      "step_ids": ["step_4", "step_5"]
    }
  ]
}
```

**steps JSONB structure (unchanged):**
```json
{
  "steps": [
    {
      "id": "step_1",
      "order": 1,
      "phase_id": "phase_1",  // NEW: Link to phase
      "type": "assign_task",
      "name": "Assign Initial Review",
      "config": {
        "title": "Review Application",
        "assign_to": { "type": "role", "role": "reviewer" }
      }
    }
  ]
}
```

### workflow_executions Table (updated)

```sql
CREATE TABLE workflow_executions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  TEXT NOT NULL,
  workflow_definition_id  UUID NOT NULL REFERENCES workflow_definitions(id),
  contact_id              UUID NOT NULL REFERENCES contacts(id),
  current_step_id         TEXT,
  current_phase_id        TEXT,  -- NEW: Track current phase
  status                  TEXT NOT NULL DEFAULT 'running',
  variables               JSONB DEFAULT '{}',
  source                  TEXT DEFAULT 'manual',
  source_id               TEXT,
  started_at              TIMESTAMPTZ DEFAULT NOW(),
  completed_at            TIMESTAMPTZ,
  temporal_workflow_id    TEXT,
  temporal_run_id         TEXT,
  metadata                JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
```

### tasks Table (updated)

```sql
CREATE TABLE tasks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                TEXT NOT NULL,
  workflow_execution_id UUID REFERENCES workflow_executions(id),
  contact_id            UUID REFERENCES contacts(id),
  assigned_to           TEXT REFERENCES users(id),  -- Specific user if claimed
  assigned_role         TEXT,  -- NEW: Role if role-based assignment
  title                 TEXT NOT NULL,
  description           TEXT,
  task_type             TEXT DEFAULT 'standard',  -- NEW: standard, approval
  status                TEXT NOT NULL DEFAULT 'todo',
  priority              TEXT DEFAULT 'medium',
  outcome               TEXT,  -- NEW: approved, rejected, completed, etc.
  outcome_comment       TEXT,  -- NEW: Comment from approver
  position              INTEGER DEFAULT 0,
  due_date              DATE,
  completed_at          TIMESTAMPTZ,
  created_by_step_id    TEXT,
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_role ON tasks(assigned_role) WHERE assigned_role IS NOT NULL;
```

### users Table (updated)

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,  -- Clerk user ID
  org_id        TEXT NOT NULL,
  email         TEXT NOT NULL,
  first_name    TEXT,
  last_name     TEXT,
  role          TEXT DEFAULT 'user',  -- DEPRECATED: use roles array
  roles         TEXT[] DEFAULT '{}',  -- NEW: Array of roles
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_roles ON users USING GIN(roles);
```

---

## Workflow Builder UI

### Builder Modal Structure

**Tab: Workflow Builder** (shows library)
- Table of workflow definitions
- "Create Workflow" button → opens modal
- Click row → opens modal in edit mode

**Modal Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Library    Applicant Onboarding Workflow    Save │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Sidebar                    Main Canvas                      │
│  ┌─────────────┐           ┌──────────────────────────────┐ │
│  │ Settings    │           │  Phase 1: Initial Review     │ │
│  │ - Name      │           │  ┌────────────────────────┐  │ │
│  │ - Desc      │           │  │ [≡] Assign Review  [⚙] │  │ │
│  │             │           │  └────────────────────────┘  │ │
│  │ Phases      │           │  ┌────────────────────────┐  │ │
│  │ + Add Phase │           │  │ [≡] Wait for Review[⚙] │  │ │
│  │             │           │  └────────────────────────┘  │ │
│  │ Steps       │           │                              │ │
│  │ + Add Step  │           │  Phase 2: Approval           │ │
│  │             │           │  ┌────────────────────────┐  │ │
│  │ Variables   │           │  │ [≡] Manager Approval[⚙]│  │ │
│  │             │           │  └────────────────────────┘  │ │
│  └─────────────┘           └──────────────────────────────┘ │
│                                                               │
│                                                         Save  │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Phases shown as collapsible sections
- Steps grouped under phases
- Drag steps to reorder (within or between phases)
- Click gear icon → open step config panel
- Add step button → choose type → configure

### Step Configuration Panel

**For assign_task:**
```
┌─────────────────────────────────┐
│ Configure: Assign Review Task   │
├─────────────────────────────────┤
│ Task Title                      │
│ [Review Application]            │
│                                 │
│ Description                     │
│ [Review and approve...]         │
│                                 │
│ Assignment Type                 │
│ ○ Specific User                 │
│ ● Role                          │
│ └─ Role: [reviewer ▼]           │
│                                 │
│ Priority                        │
│ [Medium ▼]                      │
│                                 │
│ Due in (days)                   │
│ [3]                             │
│                                 │
│         [Cancel]  [Save Step]   │
└─────────────────────────────────┘
```

**For wait_for_approval:**
```
┌─────────────────────────────────┐
│ Configure: Manager Approval     │
├─────────────────────────────────┤
│ Title                           │
│ [Review Application]            │
│                                 │
│ Assign to                       │
│ ● Role: [manager ▼]             │
│ ○ Specific User                 │
│                                 │
│ Approval Options                │
│ Approve Label: [Approve]        │
│ Reject Label:  [Reject]         │
│ ☑ Require comment               │
│                                 │
│ Due in (days)                   │
│ [5]                             │
│                                 │
│         [Cancel]  [Save Step]   │
└─────────────────────────────────┘
```

---

## User Flows

### Flow 1: Build a Workflow

1. User clicks "Workflow Builder" tab
2. Clicks "Create Workflow"
3. Modal opens → enter name/description
4. Click "Add Phase" → name phase
5. Click "Add Step" → select type → configure
6. Repeat for all steps
7. Click "Save" → definition stored in DB

### Flow 2: Trigger a Workflow Execution

1. User goes to Workflows tab
2. Clicks "Start Workflow"
3. Selects workflow definition
4. Selects contact (who is this for?)
5. Clicks "Start"
6. API creates workflow_execution
7. API calls Temporal to start generic-workflow
8. Execution appears in "Workflows" tab

### Flow 3: Complete an Approval Task

1. User sees task in "My Work"
2. Task shows "Approve" / "Reject" buttons
3. User clicks "Approve"
4. Modal: "Add comment (optional)"
5. User enters comment, clicks "Submit"
6. API: Update task (outcome='approved', comment, status='done')
7. API: Send signal to Temporal workflow
8. Workflow: Receives signal, continues to next step
9. Next step evaluates condition on outcome

### Flow 4: Role-Based Task Assignment

1. Workflow creates task: assign_to = { type: 'role', role: 'reviewer' }
2. Task created with assigned_role='reviewer', assigned_to=NULL
3. "My Work" page shows "Available Tasks" section
4. Any user with 'reviewer' role sees task
5. User clicks "Claim Task"
6. API: Update task.assigned_to = current_user
7. Task moves to user's assigned tasks
8. User completes task normally

---

## Phase Roadmap Updates

### Phase 2: Workflow Builder (Updated)

**Add:**
- [ ] Phase management UI (add, edit, delete phases)
- [ ] Phase grouping in step list (collapsible sections)
- [ ] Drag steps between phases
- [ ] Phase progress indicator in execution view
- [ ] Role selector in task assignment config
- [ ] wait_for_approval step type component
- [ ] Approval outcome selection in step config

### Phase 3: Core CRUD (Updated)

**Add:**
- [ ] Role management UI (assign roles to users)
- [ ] Role-based task filtering in "My Work"
- [ ] "Available Tasks" section (unclaimed role-based tasks)
- [ ] "Claim Task" functionality
- [ ] Approval task UI (Approve/Reject buttons)
- [ ] Approval comment modal

### Phase 4: Tasks & Kanban (Updated)

**Add:**
- [ ] PATCH /api/tasks/:id/claim (claim role-based task)
- [ ] PATCH /api/tasks/:id/approve (approve with comment)
- [ ] PATCH /api/tasks/:id/reject (reject with comment)
- [ ] Task outcome tracking in DB
- [ ] Role-based task queries

---

## What Makes This Simpler Than Motion

| Feature | Motion | Byte Dashboard |
|---------|--------|----------------|
| **Roles** | Primary/secondary, many-to-many | Simple role strings, one assignee |
| **Phases** | Complex landmark triggers | Visual grouping only |
| **Conditions** | Multi-field AND/OR logic | Simple if/then branching |
| **Task Types** | 10+ types (DocuSign, relationships, etc.) | 5 core types, focused |
| **Builder UI** | Complex graph, requires training | Linear list, drag-and-drop |
| **Setup** | Requires consultant ($120-180/hr) | Self-serve |
| **Learning Curve** | Steep, requires flowcharting | Intuitive, learn by doing |
| **Use Cases** | Complex multi-stakeholder processes | 80% common workflows |

---

## Success Metrics

**User can build a workflow in < 30 minutes that would take 4+ hours in Motion**

**Example: Applicant Onboarding**

Motion setup:
- Define CRM entities (1 hr)
- Map relationships (30 min)
- Build dashboards (1 hr)
- Create workflow (1 hr)
- Configure triggers (30 min)
- Test (1 hr)
= **5 hours minimum**

Byte Dashboard:
- Create workflow definition (5 min)
- Add 3 phases (5 min)
- Add 8 steps (10 min)
- Configure conditions (5 min)
- Test (5 min)
= **30 minutes**

---

## Next Steps

1. ✅ Review and approve this finalized architecture
2. Update all documentation to reflect roles, phases, approval patterns
3. Update schema with new fields (phases, roles, outcome)
4. Begin Phase 2: Workflow Builder implementation
5. Implement role system in Clerk + API
6. Build approval step type
7. Test end-to-end workflow with roles + approvals

---

**Status:** Ready for approval ✅
