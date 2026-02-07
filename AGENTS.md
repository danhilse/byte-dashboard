# AGENTS.md

Agent operating guide for `byte-dashboard`.

## Project Snapshot

- Stack: Next.js App Router, TypeScript (strict), React 19, Tailwind CSS v4
- Auth: Clerk (`@clerk/nextjs`)
- Database: PostgreSQL + Drizzle ORM
- Workflow runtime: Temporal
- Package manager: npm (`package-lock.json` present)

## Runbook

Run from repository root:

- `npm install` - install dependencies
- `npm run dev` - start local app (`http://localhost:3000`)
- `npm run build` - production build
- `npm start` - run production server
- `npm run lint` - run ESLint
- `npm run db:generate` - generate Drizzle migrations
- `npm run db:migrate` - apply pending migrations
- `npm run db:push` - push schema directly
- `npm run db:studio` - open Drizzle Studio
- `npm run worker:dev` - run Temporal worker in dev mode

## High-Level Structure

- `app/` - Next.js routes, layouts, API routes
- `components/` - UI components and feature components
- `lib/` - database, temporal, utilities, validations, mock data
- `types/` - shared domain types
- `context/` - project documentation artifacts

Main dashboard routes live in `app/(dashboard)/`:

- `dashboard` - overview
- `my-work` - user tasks
- `workflows` - active executions
- `people` - contacts
- `workflow-builder` - workflow definition library + builder modal

## Architecture Notes

- Distinguish clearly:
  - Workflow definition = blueprint (`workflow_definitions`)
  - Workflow execution = runtime instance (`workflow_executions`)
- Workflow builder is linear, step-based, and stores step JSON in DB.
- Temporal workflows in `lib/workflows/`; activities in `lib/activities/`.
- API routes under `app/api/` trigger/signal workflows.
- Tasks may or may not be linked to workflow executions.

## Code Conventions

- Keep UI primitives in `components/ui/` unchanged unless explicitly requested.
- Prefer existing shared components and utilities over new abstractions.
- Use `cn()` from `lib/utils.ts` for conditional classes.
- Keep domain types centralized in `types/index.ts` when adding shared models.
- Use route folder kebab-case (for example `my-work`, `workflow-builder`).
- Follow existing Tailwind and component patterns in nearby files.

## Data and Safety

- Do not commit secrets from `.env.local`.
- Prefer migrations for schema changes; only use `db:push` intentionally.
- Avoid destructive git commands unless explicitly requested.

## Agent Workflow

When making changes:

1. Read nearby files first to match local patterns.
2. Implement minimal, scoped edits.
3. Run targeted checks (`npm run lint`, relevant build/test command) when feasible.
4. Summarize what changed and any remaining risks.

