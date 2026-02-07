# Byte Dashboard

Byte Dashboard is a Next.js application for managing workflow definitions, workflow executions, tasks, and people in one dashboard.

## Tech Stack

- Next.js (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS v4
- Clerk authentication
- PostgreSQL + Drizzle ORM
- Temporal workflows/workers

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL
- Temporal server (for workflow runtime/worker)

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

App URL: `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start local development server
- `npm run build` - Build production bundle
- `npm start` - Run production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:migrate` - Apply pending migrations
- `npm run db:push` - Push schema directly to database
- `npm run db:studio` - Open Drizzle Studio
- `npm run worker:dev` - Run Temporal worker in development mode
- `npm run worker:start` - Run Temporal worker in production mode

## Project Structure

- `app/` - Next.js routes, layouts, and API routes
- `components/` - Shared UI and feature components
- `lib/` - Database, Temporal, utilities, and validations
- `types/` - Shared domain types
- `context/` - Project documentation artifacts

Main dashboard routes are under `app/(dashboard)/`:

- `dashboard`
- `my-work`
- `workflows`
- `people`
- `workflow-builder`

## Notes

- Workflow definition = blueprint (`workflow_definitions`)
- Workflow execution = runtime instance (`workflow_executions`)
- Use migrations for schema changes when possible
- Do not commit secrets from `.env.local`
