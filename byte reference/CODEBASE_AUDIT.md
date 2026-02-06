# Codebase Audit: byte-dashboard

**Date:** February 2026
**Auditor:** External review prior to joining project
**Recommendation:** Rewrite from scratch with focused MVP scope

---

## Executive Summary

This codebase was built using Lovable.dev as a prototyping/discovery tool. It successfully helped the team figure out what they wanted to build, but the resulting implementation has significant technical debt that makes it unsuitable as a production foundation.

**Decision: Start fresh with a clean implementation targeting the actual MVP requirements.**

The old codebase serves as a reference artifact - extract domain knowledge, data models, and UI patterns, but don't inherit the implementation.

---

## Key Findings

### 1. Prototype, Not Production Code

- **Built with Lovable.dev** - AI-generated scaffold meant for prototyping
- **325 database migrations** - Indicates schema churn from rapid iteration without planning
- **Emergency recovery docs at repo root** - Production incidents have occurred
  - `EMERGENCY_RECOVERY_GUIDE.md`
  - `DATABASE_RECOVERY_INSTRUCTIONS.md`
  - Users were deleted due to RLS policy bugs

### 2. Massive Over-Build

What exists vs what MVP needs:

| Built | MVP Needs |
|-------|-----------|
| 252-file visual workflow builder | Simple status sequences |
| 66 Supabase edge functions | ~5-10 API routes |
| 142 database tables | ~10-15 tables |
| AI assistant integration | Not in MVP |
| Complex RBAC with RLS | Clerk organizations |
| 187 components | ~40-50 components |

### 3. Code Quality Issues

- **No meaningful test coverage** - 7 test files for 187 components
- **Monolith components** - ContactProfile.tsx (815 lines), EnhancedPeopleTable.tsx (1000+ lines)
- **Redundant dependencies** - Two icon libraries, two toast libraries
- **Debug scaffolding in production** - 200+ lines of reload debug logging in main.tsx

### 4. Tech Stack

Current stack is actually solid - the problems are execution, not selection:

- React 19 + Vite + TypeScript
- Supabase (Postgres + Auth)
- Tailwind + Radix UI
- React Query + Zustand
- Zod + React Hook Form

---

## Why Rewrite vs Cleanup

| Factor | Cleanup | Rewrite |
|--------|---------|---------|
| Time investment | High (archaeology) | Medium (focused build) |
| Result quality | Inherited debt | Clean foundation |
| Stack preferences | Stuck with Supabase/Vite | Next.js + Clerk + Railway |
| Risk | Unknown landmines | Known scope |
| Team morale | Fighting fires | Building fresh |

The cleanup path requires understanding and fixing code that was AI-generated without coherent architecture. The rewrite path builds exactly what's needed with intentional design.

---

## What the Product Actually Is

Based on BRD review, Byte Dashboard is:

> An applicant onboarding and tracking system, initially for Fayette County Sheriff's Office, with plans to expand to nonprofits as a modern Site Stacker alternative.

**Core value proposition:**
- Ingest applications from Formstack
- Track applicants through a review process
- Manage tasks associated with applications
- Dashboard visibility into pipeline status
- Multi-tenant for multiple organizations

---

## MVP Feature Scope

### In Scope

1. **Formstack Integration**
   - Webhook endpoint to receive submissions
   - Field mapping to internal data model

2. **Application Management**
   - Application list with filters (grid view)
   - Application detail view
   - Status tracking (configurable stages)
   - Notes/activity log

3. **Contact/Applicant Records**
   - Basic contact info
   - Link to applications
   - Contact detail view

4. **Task Management**
   - Create/assign tasks
   - Due dates
   - Kanban board view
   - List view
   - Status workflow (todo → in progress → done)

5. **Simple Workflows**
   - Status sequences (config-based, not visual builder)
   - Auto-task creation on status change (optional)

6. **Dashboard**
   - Application counts by status
   - Recent applications
   - My tasks
   - Basic charts

7. **Auth & Multi-tenant**
   - Clerk for authentication
   - Organizations = tenants
   - Roles: Owner, Admin, User, Guest

8. **Exports**
   - CSV export
   - Basic PDF reports

### Out of Scope (Not MVP)

- Visual drag-and-drop workflow builder
- AI assistant (BYTE)
- Payment processing / Stripe
- Drag-and-drop PDF template designer
- Calendar integrations
- Advanced integrations beyond Formstack
- Complex RBAC beyond Clerk's built-in roles

---

## Recommended New Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js | SSR options, better routing, ecosystem |
| Auth | Clerk | Built-in organizations for multi-tenant, simple |
| Database | Postgres via Railway | Portable, SQL for reporting, compliance-friendly |
| ORM | Drizzle | TypeScript-first, lightweight, good DX |
| Styling | Tailwind + shadcn/ui | Can port components from old codebase |
| State | React Query | Keep this pattern, it works |
| Validation | Zod | Keep this pattern, it works |
| Deployment | Railway or Vercel | Simple, scalable |

---

## What to Extract from Old Codebase

### Keep as Reference

1. **Data model insights**
   - What fields do applications have?
   - What statuses exist?
   - What relationships matter?
   - Check: `src/integrations/supabase/types.ts`

2. **UI patterns**
   - shadcn/Radix component implementations
   - Can copy: `src/components/ui/`
   - Dashboard widget layouts

3. **Business logic**
   - Status transition rules
   - Validation requirements
   - Permission patterns (conceptually, not implementation)

4. **Formstack integration**
   - Field mappings
   - Webhook payload structure
   - Check: `supabase/functions/` for formstack-related functions

### Leave Behind

- 325 migrations
- RLS policy complexity
- Workflow builder (252 files)
- Auth context workarounds
- 66 edge functions
- Emergency recovery infrastructure
- Debug logging scaffolding

---

## File Reference

Key files to review when extracting domain knowledge:

```
# Data model / types
src/integrations/supabase/types.ts

# UI components worth porting
src/components/ui/

# Dashboard patterns
src/components/dashboard/

# Business logic examples (read, don't copy)
src/contexts/AuthContext.ts
src/lib/permissions.ts

# Formstack integration
supabase/functions/formstack*/

# What NOT to look at
src/features/workflow-builder/  # 252 files, not needed
```

---

## Compliance Notes

From BRD, the system needs:
- Government-level security (Sheriff's Office client)
- GDPR compliance
- SOC II guidelines
- Role-based access control
- Data encryption considerations

Clerk + Postgres on Railway/AWS addresses these. The current RLS-based approach caused data loss incidents - simpler is safer.

---

## Conclusion

This codebase served its purpose as a discovery/prototyping vehicle. The team now knows what they want. Building it properly from scratch with a focused scope will result in:

- 1/10th the code
- Predictable behavior
- Testable architecture
- Stack aligned with team preferences
- No inherited landmines

Use the old codebase as documentation of requirements, not as a foundation.
