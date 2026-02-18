# Byte Dashboard

Workflow automation dashboard for managing people, tasks, and long-running multi-step processes. The app uses Next.js App Router for the UI/API layer and Temporal for durable workflow orchestration.

## Stack

- Next.js 16 + React 19 + TypeScript (strict)
- Tailwind CSS v4
- Clerk authentication (`@clerk/nextjs`)
- PostgreSQL + Drizzle ORM
- Temporal workflows + activities
- Vitest + Testing Library

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL database
- Clerk project keys
- Temporal server (local or cloud) if you want to run workflow workers

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create local environment config:

```bash
cp .env.example .env.local
```

3. Fill in required values in `.env.local`:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `TEMPORAL_ADDRESS`
- `TEMPORAL_NAMESPACE`

4. Create/update database schema:

```bash
npm run db:generate
npm run db:migrate
```

5. Run the app:

```bash
npm run dev
```

6. Run Temporal worker (separate terminal, when testing workflow execution):

```bash
npm run worker:dev
```

App URL: [http://localhost:3000](http://localhost:3000)

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start local Next.js development server |
| `npm run build` | Create production build |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit/component tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run db:generate` | Generate Drizzle migration files |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push schema directly (dev-only workflow) |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:clear` | Clear seeded/test data |
| `npm run worker:dev` | Run Temporal worker in watch mode |
| `npm run worker:start` | Run Temporal worker once |

## Current Route Map

Dashboard pages live in `app/(dashboard)/`:

- `dashboard`
- `my-work`
- `tasks`
- `workflows` and `workflows/[id]`
- `people` and `people/[id]`
- `calendar`
- `support`
- `admin/*` (includes `admin/workflow-builder`)

API routes live in `app/api/` and include:

- `contacts`
- `tasks`
- `notes`
- `notifications`
- `users`
- `dashboard`
- `workflow-definitions`
- `workflows`
- `activity`
- `webhooks/clerk`

## Key Project Structure

```text
app/                Next.js routes, layouts, and API handlers
components/         Shared and feature-level React components
components/ui/      UI primitives (keep stable unless explicitly requested)
lib/db/             Drizzle schema and DB access
lib/workflows/      Temporal workflow definitions
lib/activities/     Temporal activity implementations
lib/temporal/       Temporal client/worker wiring
lib/data/           Mock and seed data helpers
types/              Shared domain types
context/            Architecture and roadmap docs
```

## Core Concepts

- Workflow definition = reusable blueprint (`workflow_definitions`)
- Workflow execution = runtime instance (`workflow_executions`)
- Tasks can be standalone or linked to workflow executions
- Workflow-generated task completion can signal Temporal workflows to continue

## Development Notes

- Prefer DB migrations (`db:generate` + `db:migrate`) for trackable schema changes.
- Use `db:push` intentionally for development-only schema sync.
- Keep shared domain models centralized in `types/index.ts`.
- Use `cn()` from `lib/utils.ts` for conditional Tailwind classes.
- Reuse shared components/utilities before adding new abstractions.

## Documentation

- [context/FINALIZED_ARCHITECTURE.md](context/FINALIZED_ARCHITECTURE.md)
- [context/MVP_ROADMAP.md](context/MVP_ROADMAP.md)
- [context/SCHEMA_BREAKDOWN.md](context/SCHEMA_BREAKDOWN.md)
- [context/v1.md](context/v1.md)
- [CLAUDE.md](CLAUDE.md)
