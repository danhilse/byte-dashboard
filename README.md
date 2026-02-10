# Byte Dashboard

A lightweight workflow automation platform for tracking people through multi-step processes. Built with Next.js, TypeScript, and Temporal.io for durable, long-running workflows.

## What is Byte Dashboard?

Byte Dashboard helps teams manage complex, multi-step processes that span hours, days, or weeks. Whether onboarding new applicants, processing customer requests, or coordinating multi-stage reviews, Byte Dashboard provides:

- **Visual Workflow Builder** - Design step-by-step processes with triggers, tasks, conditions, and wait states
- **Durable Execution** - Workflows survive server restarts and continue from where they left off (powered by Temporal)
- **Task Management** - Assign work to team members and track progress
- **Contact Tracking** - Manage people moving through your workflows
- **Real-time Updates** - Dashboard shows active workflows, tasks, and activity

## Tech Stack

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TypeScript (strict mode)
- Tailwind CSS v4
- shadcn/ui components (Radix primitives)
- TanStack Table
- dnd-kit (drag & drop)

**Backend:**
- PostgreSQL (database)
- Drizzle ORM
- Temporal.io (workflow orchestration)
- Clerk (authentication)

**Deployment:**
- Vercel (Next.js app)
- Railway (Temporal workers - planned)

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL database
- Temporal server (local dev or cloud)
- Clerk account (authentication)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

Copy the example environment file and configure your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key
- `TEMPORAL_ADDRESS` - Temporal server address

### 3. Set Up Database

Generate and run migrations:

```bash
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply migrations
```

Or push schema directly (for development):

```bash
npm run db:push
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Start Temporal Worker (Optional)

For workflow execution, run the Temporal worker:

```bash
npm run worker:dev
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server at http://localhost:3000 |
| `npm run build` | Build for production (fails on type/route errors) |
| `npm start` | Run compiled production build |
| `npm run lint` | Run ESLint 9 with Next.js config |
| `npm run db:generate` | Generate Drizzle migrations from schema |
| `npm run db:migrate` | Run pending database migrations |
| `npm run db:push` | Push schema changes directly to database |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |
| `npm run worker:dev` | Run Temporal worker (development) |
| `npm run worker:start` | Run Temporal worker (production) |

## Project Structure

```
byte-dashboard/
├── app/                         # Next.js App Router
│   ├── (dashboard)/            # Dashboard route group (shared layout)
│   │   ├── layout.tsx          # Sidebar + top navigation
│   │   ├── dashboard/          # Overview page
│   │   ├── my-work/            # Personal task list
│   │   ├── workflows/          # Active workflow executions
│   │   ├── people/             # Contact management
│   │   ├── workflow-builder/   # Workflow definition library + builder
│   │   ├── calendar/           # Calendar view
│   │   ├── support/            # Support section
│   │   └── admin/              # Admin tools & settings
│   ├── api/                    # API routes
│   │   ├── webhooks/           # External webhooks (Formstack, etc.)
│   │   └── workflows/          # Workflow trigger endpoints
│   └── globals.css             # Tailwind v4 + CSS variables
├── components/
│   ├── ui/                     # shadcn/ui primitives (DO NOT edit)
│   ├── layout/                 # App sidebar, page headers
│   ├── data-table/             # Reusable data table with TanStack Table
│   ├── workflow-builder/       # Workflow builder UI components
│   ├── workflows/              # Workflow execution components
│   ├── contacts/               # Contact components
│   ├── tasks/                  # Task components
│   ├── kanban/                 # Kanban board (generic + entity-specific)
│   ├── dashboard/              # Dashboard widgets
│   └── common/                 # Shared components (filters, dialogs, etc.)
├── lib/
│   ├── data/                   # Mock data for development
│   ├── db/                     # Drizzle schema, queries, connection
│   ├── workflows/              # Temporal workflow definitions
│   ├── activities/             # Temporal activities (DB, email, API calls)
│   ├── temporal/               # Temporal client & worker setup
│   ├── validations/            # Zod schemas
│   ├── design-tokens.ts        # Semantic color mappings
│   ├── status-config.ts        # Badge variants for statuses
│   └── utils.ts                # Utility functions (cn, etc.)
├── types/
│   └── index.ts                # TypeScript types for domain models
├── hooks/                      # Custom React hooks
├── context/                    # Reference documentation
│   ├── ARCHITECTURE.md         # System architecture & design decisions
│   ├── MVP_ROADMAP.md          # Development roadmap
│   ├── SCHEMA_BREAKDOWN.md     # Database schema documentation
│   └── v1.md                   # Product specification
├── CLAUDE.md                   # Development guide for Claude Code
├── drizzle.config.ts           # Drizzle Kit configuration
├── package.json
├── tsconfig.json
└── next.config.ts
```

## Key Concepts

### Workflow Definitions vs Executions

- **Workflow Definition** = Blueprint with steps, triggers, and conditions (stored in `workflow_definitions` table)
- **Workflow Execution** = Running instance of a workflow definition (stored in `workflow_executions` table)

Example: An "Applicant Onboarding" workflow definition can have many executions (one per applicant).

### Tasks

Tasks are work items assigned to users. They can be:
- **Standalone** - Created manually by users
- **Workflow-generated** - Created by workflows and linked to `workflow_execution_id`

When a workflow-generated task is completed, it signals the workflow to continue.

### Temporal Integration

Byte Dashboard uses [Temporal.io](https://temporal.io) for workflow orchestration:
- **Workflows** (`lib/workflows/`) - Define orchestration logic
- **Activities** (`lib/activities/`) - Perform actual work (DB updates, API calls, emails)
- **Signals** - External events that resume waiting workflows (task completion, form submission)

Workflows can wait for hours/days/weeks for external events while maintaining state.

### Authentication

Uses [Clerk](https://clerk.com) for authentication:
- User session management
- Organization/workspace support
- Role-based access (admin checks planned)

## Development Workflow

### Adding a New Feature

1. Define types in `types/index.ts` (if new domain models needed)
2. Add mock data to `lib/data/` (for local development)
3. Create page in `app/(dashboard)/[section]/page.tsx`
4. Build components in `components/[section]/`
5. Add navigation links to `app-sidebar.tsx` if needed

### Working with Workflows

1. **Define workflow** in `lib/workflows/` (orchestration logic)
2. **Define activities** in `lib/activities/` (DB operations, API calls, emails)
3. **Create trigger endpoint** in `app/api/workflows/` to start workflows
4. **Add signal handlers** for external events (task completion, form submission)

### Working with the Database

```bash
# Make schema changes in lib/db/schema.ts

# Option 1: Generate migration (recommended for production)
npm run db:generate
npm run db:migrate

# Option 2: Push directly (faster for development)
npm run db:push

# View/edit data
npm run db:studio
```

## Path Aliases

The project uses `@/*` to resolve to the project root:

```typescript
import { Button } from "@/components/ui/button"
import { Task } from "@/types"
import { cn } from "@/lib/utils"
```

Never use deep relative paths like `../../../components`.

## Design System

### Styling
- Tailwind CSS v4 with CSS variables in `globals.css`
- Semantic color tokens in `lib/design-tokens.ts`
- Theme switching via `next-themes`
- Use `cn()` utility for conditional classes

### Component Patterns
- UI primitives from shadcn/ui (DO NOT edit directly)
- Reusable data tables with TanStack Table
- Generic components with TypeScript generics for type safety
- Config-driven components (pass configuration objects)

### Code Style
- TypeScript strict mode (avoid `any`)
- Prefer named exports over default exports
- PascalCase for components, camelCase for hooks
- Co-locate entity-specific logic by domain

## Reference Documentation

Comprehensive project documentation is in the `context/` folder:

- **[ARCHITECTURE.md](context/ARCHITECTURE.md)** - System architecture, data flows, design decisions
- **[MVP_ROADMAP.md](context/MVP_ROADMAP.md)** - Development roadmap with phases
- **[SCHEMA_BREAKDOWN.md](context/SCHEMA_BREAKDOWN.md)** - Database schema documentation
- **[v1.md](context/v1.md)** - Product specification and requirements
- **[CLAUDE.md](CLAUDE.md)** - Development guide for Claude Code

## Current Status

This project is in active development. Current mock data is used for the UI layer while the backend integration with Temporal and full database persistence is being implemented.

See [MVP_ROADMAP.md](context/MVP_ROADMAP.md) for the development timeline and progress.

## Contributing

1. Review [CLAUDE.md](CLAUDE.md) for project conventions
2. Check [context/](context/) folder for architecture documentation
3. Follow TypeScript strict mode - lift types to `types/index.ts`
4. Use semantic color tokens from `design-tokens.ts`
5. Keep components reusable and type-safe

## License

[Add license information]

## Support

For questions or issues, refer to the documentation in the `context/` folder or contact the team.
