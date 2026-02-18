# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands are run from the project root:

- `npm install` - Install dependencies (required once)
- `npm run dev` - Start development server at http://localhost:3000
- `npm run build` - Build for production (fails on route or type errors)
- `npm start` - Run compiled production build for smoke testing
- `npm run lint` - Run ESLint 9 with Next.js config
- `npm run test` - Run Vitest test suite
- `npm run test:watch` - Run Vitest in watch mode
- `npm run test:coverage` - Run Vitest with coverage
- `npm run db:generate` - Generate Drizzle migrations from schema
- `npm run db:migrate` - Run pending database migrations
- `npm run db:push` - Push schema changes directly to database
- `npm run db:studio` - Open Drizzle Studio (database GUI)
- `npm run db:clear` - Clear test data from database
- `npm run worker:dev` - Start Temporal worker in dev mode (watch)
- `npm run worker:start` - Start Temporal worker

## Reference Documents

Reference documents for this project are created and read in the `context/` folder. This includes architecture documentation, roadmaps, schema definitions, and other planning artifacts.

## Project Structure

Byte Dashboard is a Next.js 16 App Router application using TypeScript strict mode, Tailwind CSS v4, and Clerk authentication.

```
byte-dashboard/
├── app/                         # Next.js App Router
│   ├── (dashboard)/            # Route group with shared dashboard layout
│   │   ├── layout.tsx          # Sidebar + top navigation wrapper
│   │   ├── page.tsx            # Route group landing page
│   │   ├── dashboard/          # Main dashboard view
│   │   ├── my-work/            # Tasks assigned to logged-in user
│   │   ├── tasks/              # Task management
│   │   ├── workflows/          # Active workflow executions
│   │   │   ├── page.tsx
│   │   │   └── [id]/           # Individual workflow detail
│   │   ├── people/             # Contact/people management
│   │   ├── calendar/           # Calendar view
│   │   ├── support/            # Support section
│   │   └── admin/              # Admin section
│   │       ├── settings/       # Settings with tab-based sub-navigation
│   │       │   ├── layout.tsx  # Shared tabs for all settings pages
│   │       │   ├── page.tsx
│   │       │   ├── general/    # General workspace settings
│   │       │   ├── billing/    # Billing & plans
│   │       │   ├── users/      # Users & permissions
│   │       │   ├── integrations/
│   │       │   ├── audit/      # Audit logs
│   │       │   ├── crm/        # CRM-specific settings
│   │       │   └── customizations/
│   │       ├── forms/          # Form management
│   │       ├── assets/         # Asset management
│   │       └── workflow-builder/  # Workflow definitions library + builder
│   │           ├── page.tsx       # List/table of workflow definitions
│   │           └── [id]/          # Individual definition editor
│   ├── api/                    # Next.js API routes
│   │   ├── activity/           # Activity log endpoints
│   │   ├── contacts/           # Contact CRUD + [id] routes
│   │   ├── dashboard/          # Dashboard stats, workflows-over-time
│   │   ├── notes/              # Notes CRUD + [id] routes
│   │   ├── notifications/      # Notification CRUD + [id] routes
│   │   ├── tasks/              # Task CRUD + [id] routes
│   │   ├── users/              # User endpoints
│   │   ├── webhooks/           # Webhook handlers (Clerk)
│   │   ├── workflow-definitions/ # Workflow definition CRUD + [id] routes
│   │   └── workflows/          # Workflow execution CRUD + trigger + [id]
│   ├── mvp_roadmap/            # Internal roadmap viewer
│   ├── globals.css             # Tailwind v4 imports + CSS variables
│   └── layout.tsx              # Root layout with theme provider
├── components/
│   ├── ui/                     # shadcn/ui components (Radix primitives)
│   ├── layout/                 # app-sidebar, page-header, quick-add-fab, route-title-sync
│   ├── data-table/             # Reusable DataTable with TanStack Table
│   │   ├── data-table.tsx
│   │   ├── data-table-toolbar.tsx
│   │   ├── data-table-pagination.tsx
│   │   ├── data-table-bulk-actions.tsx
│   │   ├── data-table-column-toggle.tsx
│   │   └── columns/            # Column definitions by entity
│   │       ├── contact-columns.tsx
│   │       ├── definition-columns.tsx
│   │       ├── task-columns.tsx
│   │       └── workflow-columns.tsx
│   ├── workflow-builder/       # Workflow builder components
│   │   ├── workflow-definition-create-dialog.tsx
│   │   ├── workflow-definition-editor.tsx
│   │   ├── workflow-definitions-index.tsx
│   │   ├── types/              # Workflow builder type definitions
│   │   └── v2/                 # V2 builder system
│   │       ├── workflow-builder-v2.tsx    # Main builder component
│   │       ├── step-list-v2.tsx          # Draggable step list
│   │       ├── step-card-v2.tsx          # Step card component
│   │       ├── step-config-panel-v2.tsx  # Step configuration panel
│   │       ├── trigger-card.tsx          # Trigger step card
│   │       ├── trigger-config-panel.tsx  # Trigger configuration
│   │       ├── trigger-config.tsx
│   │       ├── branch-step-card.tsx      # Branch/condition step
│   │       ├── variable-selector.tsx     # Template variable picker
│   │       ├── templated-text-input.tsx  # Text input with variables
│   │       ├── field-value-input.tsx
│   │       ├── confirm-action.tsx
│   │       ├── workflow-config-dialog.tsx
│   │       ├── workflow-json-export.tsx
│   │       ├── actions/                  # Step action components
│   │       └── advancement/              # Step advancement components
│   ├── workflows/              # Workflow execution components
│   ├── contacts/               # Contact-specific components
│   ├── tasks/                  # Task-specific components
│   ├── kanban/                 # Kanban board with dnd-kit
│   │   ├── generic-kanban-board.tsx  # Generic reusable kanban
│   │   ├── kanban-board.tsx          # Task kanban (wraps generic)
│   │   ├── kanban-card.tsx           # Task kanban card
│   │   ├── workflows-kanban-board.tsx # Workflow kanban (wraps generic)
│   │   └── workflow-kanban-card.tsx   # Workflow kanban card
│   ├── assets/                 # Asset management components
│   │   ├── asset-list.tsx
│   │   ├── asset-preview-modal.tsx
│   │   └── asset-uploader.tsx
│   ├── dashboard/              # Dashboard widgets and animated components
│   ├── detail/                 # Detail page components (activity-feed, detail-header, notes-section)
│   └── common/                 # Shared presentational components
│       ├── animated-counter.tsx
│       ├── animated-header.tsx
│       ├── animated-table-row.tsx
│       ├── empty-state.tsx
│       ├── form-dialog.tsx
│       ├── info-field.tsx
│       ├── shimmer-card.tsx
│       ├── status-badge.tsx    # ContactStatusBadge, WorkflowStatusBadge, TaskStatusBadge, TaskPriorityBadge
│       ├── status-filter.tsx   # Generic StatusFilter<T> component
│       └── view-toggle.tsx
├── lib/
│   ├── data/                   # Mock data for development
│   │   ├── activity.ts
│   │   ├── assets.ts
│   │   ├── contacts.ts
│   │   └── settings.ts
│   ├── db/                     # Database layer (Drizzle)
│   │   ├── index.ts            # DB connection
│   │   ├── schema.ts           # Drizzle schema
│   │   ├── queries.ts          # Reusable queries
│   │   ├── log-activity.ts     # Activity logging helper
│   │   └── migrations/         # Drizzle migration files
│   ├── workflows/              # Temporal workflows
│   │   ├── generic-workflow.ts   # Generic interpreter for user-defined workflows
│   │   └── onboarding-workflow.ts  # Example: applicant onboarding
│   ├── activities/             # Temporal activities
│   │   ├── database.ts         # DB operations
│   │   ├── email.ts            # Email sending
│   │   └── integrations.ts     # External API calls
│   ├── temporal/               # Temporal setup
│   │   ├── client.ts           # Temporal client
│   │   └── worker.ts           # Temporal worker
│   ├── workflow-builder-v2/    # V2 workflow builder logic
│   │   ├── builder-state.ts          # Core builder state management
│   │   ├── builder-session-state.ts  # Session state management
│   │   ├── builder-ui-state.ts       # UI state management
│   │   ├── builder-command-serializer.ts  # Command serialization
│   │   ├── workflow-operations.ts    # Workflow CRUD operations
│   │   ├── action-registry.ts        # Available step actions
│   │   ├── condition-registry.ts     # Available conditions
│   │   ├── status-guardrails.ts      # Status validation
│   │   ├── template-variable-utils.ts # Template variable helpers
│   │   ├── variable-utils.ts         # Variable utilities
│   │   ├── id-utils.ts              # ID generation
│   │   ├── types.ts                 # V2 type definitions
│   │   ├── mock-workflows-v2.ts     # Mock data for v2
│   │   └── adapters/               # Runtime adapters
│   │       └── definition-runtime-adapter.ts
│   ├── notifications/          # Notification service
│   │   └── service.ts
│   ├── users/                  # User service
│   │   └── service.ts
│   ├── tasks/                  # Task business logic
│   │   ├── access.ts           # Task access control
│   │   ├── approval-requirements.ts  # Approval logic
│   │   └── presentation.ts    # Task presentation helpers
│   ├── contact-fields-config.ts  # Contact field configuration
│   ├── task-fields-config.ts     # Task field configuration
│   ├── field-input-types.ts      # Field input type definitions
│   ├── design-tokens.ts        # Semantic color mappings (priority, status, activity, trend)
│   ├── motion-variants.ts      # Framer Motion animation variants
│   ├── roles-config.ts         # Role configuration
│   ├── status-config.ts        # Badge variants for statuses/priorities
│   ├── status-utils.ts         # Status utility functions
│   ├── workflow-status.ts      # Workflow status helpers
│   ├── workflow-triggers.ts    # Workflow trigger definitions
│   └── utils.ts                # Utility functions (cn, etc.)
├── types/
│   └── index.ts                # TypeScript types for all domain models
├── hooks/                      # Custom React hooks
│   ├── index.ts                # Barrel exports
│   ├── use-data.ts             # useOptimisticAction, useDebouncedValue, useDebouncedCallback
│   ├── use-detail-dialog-edit.ts  # Generic detail dialog edit state hook
│   ├── use-mobile.ts           # useIsMobile responsive hook
│   ├── use-org-role.ts         # useOrgRole, useIsAdmin
│   ├── use-persisted-view.ts   # Persisted view preference hook
│   └── use-toast.ts            # Toast notification hook
├── scripts/                    # Utility scripts
│   ├── clear-test-data.ts      # Clear test data from DB
│   ├── seed-test-contacts.sql  # Seed test contacts
│   ├── create-test-contact.ts  # Create individual test contact
│   ├── check-org-data.ts       # Verify org data
│   ├── check-tasks.ts          # Verify task data
│   └── fix-schema.ts           # Schema repair utility
├── middleware.ts               # Clerk authentication middleware (protects non-public routes)
├── drizzle.config.ts           # Drizzle Kit configuration
├── package.json
├── tsconfig.json
├── next.config.ts
└── .env.local
```

## Architecture & Key Patterns

### 1. Route Organization & Tab Structure

**Main Navigation Tabs:**
- **Dashboard** - Overview page with stats and widgets
- **My Work** - Tasks assigned to logged-in user (personal task list)
- **Workflows** - Active/running workflow executions (with detail view at `/workflows/[id]`)
- **People** - Contact management (data used in workflows)

**Admin Section:**
- **Workflow Builder** - Library of workflow definitions + v2 builder (`/admin/workflow-builder`)
- **Forms** - Form management (`/admin/forms`)
- **Assets** - Asset management (`/admin/assets`)
- **Settings** - Nested tab layout with 7 tabs

**Key Patterns:**
- All dashboard routes live inside `app/(dashboard)/` route group which provides the sidebar layout
- Settings pages use nested layout (`admin/settings/layout.tsx`) for tab navigation
- Use kebab-case for route folder names (e.g., `/my-work`, `/workflow-builder`)

**Workflow Builder Pattern:**
- Library view at `/admin/workflow-builder` shows list/table of workflow definitions
- Individual definition editor at `/admin/workflow-builder/[id]`
- V2 builder system with drag-and-drop steps, triggers, branches, and template variables

### 2. Authentication
- Clerk handles authentication via `@clerk/nextjs`
- `useUser()` and `useClerk()` hooks provide user data and sign-out functionality
- `middleware.ts` protects all routes except `/`, `/sign-in`, `/sign-up`, and `/api/webhooks`
- `useOrgRole()` and `useIsAdmin()` hooks in `hooks/use-org-role.ts` for role-based access

### 3. Component Structure
- UI primitives from shadcn/ui in `components/ui/` - DO NOT edit these directly
- Data tables use TanStack Table with shared `DataTable` component and entity-specific column definitions
- Layouts use nested structures: root layout → dashboard layout → settings layout → page content
- Components are client-side by default unless marked with `"use server"`

### 4. Type System
- All domain types centralized in `types/index.ts`
- Status/priority types are string unions (e.g., `"low" | "medium" | "high"`)
- Configuration maps in `lib/status-config.ts` provide badge variants for each status
- Use `satisfies` operator to enforce type safety on config objects

### 5. Styling & Design System
- Tailwind CSS v4 with CSS variables defined in `globals.css`
- Semantic color tokens in `lib/design-tokens.ts` map meanings to classes:
  - `priorityColors` - Task/application priority indicators
  - `activityColors` - Activity feed icon colors
  - `trendColors` - Stats trend indicators (positive/negative)
  - `statusColors` - Generic status feedback (info/success/warning/error)
- Animation variants in `lib/motion-variants.ts` for Framer Motion
- Use `cn()` utility from `lib/utils.ts` for conditional class merging
- Theme switching via `ThemeProvider` with `next-themes`
- Maintain Tailwind class order: layout → spacing → color → state

### 6. Data & State Management
- Mock data in `lib/data/*` for development (contacts, activity, assets, settings)
- Business data stored in PostgreSQL via Drizzle:
  - `workflow_definitions` - workflow blueprints (steps in JSONB)
  - `workflow_executions` - workflow instances/runs
  - `contacts` - people tracked in workflows
  - `tasks` - work items assigned to users
- API routes in `app/api/` provide CRUD endpoints for all entities
- Activity logging via `lib/db/log-activity.ts`
- Workflow execution state managed by Temporal's persistence layer
- Client state via custom hooks (`use-data.ts`: `useOptimisticAction`, `useDebouncedValue`)
- Use React Server Components where possible; opt into client components with `"use client"`

### 7. Workflow Architecture

**Terminology:**
- **Workflow Definition** = Blueprint with steps, conditions, triggers (stored in `workflow_definitions` table)
- **Workflow Execution** = Instance/run of a workflow definition (stored in `workflow_executions` table)
- **Example Use Case**: Applicant onboarding is ONE example of a workflow

**Workflow Builder (V2):**
- Located in `components/workflow-builder/v2/` (UI) and `lib/workflow-builder-v2/` (logic)
- Step-based builder with triggers, actions, conditions, and branches
- Template variable system for dynamic content
- Action registry and condition registry for extensibility
- Status guardrails for validation
- Command serialization for undo/redo support

**Task ↔ Workflow Integration:**
- Tasks can be standalone (manual) or created by workflows
- Task status updates can signal workflows to continue
- Workflow status changes can create or update tasks
- Signal flow: Task status change → API checks `workflow_execution_id` → sends Temporal signal if exists
- Not all tasks signal workflows (only if `workflow_execution_id` is not null)

**Temporal Integration:**
- Generic workflow interpreter (`lib/workflows/generic-workflow.ts`) reads workflow definitions and executes steps
- Activities defined in `lib/activities/` - actual work (DB, API calls, emails)
- Workflows started via API routes (`app/api/workflows/`)
- Workflows signaled from UI (task completion via `PATCH /api/tasks/:id/status`)
- Can wait hours/days/weeks for external events
- Temporal handles execution state, Postgres stores business data
- Worker scripts: `npm run worker:dev` (watch mode) / `npm run worker:start`

### 8. Path Aliases
- `@/*` resolves to `./*` (configured in tsconfig.json)
- Import example: `import { Button } from "@/components/ui/button"`
- Never use deep relative paths like `../../../components`

### 9. Settings Architecture
The settings section uses a nested layout pattern:
- Base path: `/admin/settings`
- Layout (`admin/settings/layout.tsx`) renders:
  - PageHeader with breadcrumbs
  - Section title and description
  - Trial status banner
  - Tab navigation (7 tabs: General, Billing, Users, Integrations, Audit, CRM, Customizations)
- Each tab is a separate route with its own `page.tsx`
- Active tab determined by pathname matching

## Development Workflow

### Adding a New Feature
1. Define types in `types/index.ts` if new domain models are needed
2. Add mock data to appropriate file in `lib/data/`
3. Create page in `app/(dashboard)/[section]/page.tsx`
4. Build reusable components in `components/[section]/`
5. Use existing data-table patterns for list views
6. Add navigation links to `app-sidebar.tsx` if needed
7. Add API route in `app/api/[section]/route.ts` for backend integration
8. Add tests alongside implementation files

### Working with Forms
- Use shadcn/ui form primitives (Input, Select, Textarea, etc.)
- Use `FormDialog` wrapper from `components/common/form-dialog.tsx` for dialog-based forms
- Field configs in `lib/contact-fields-config.ts` and `lib/task-fields-config.ts`

### Working with Data Tables
- Column definitions live in `components/data-table/columns/`
- Use `DataTable` component with `DataTableToolbar` and `DataTablePagination`
- Bulk actions via `DataTableBulkActions`, column visibility via `DataTableColumnToggle`
- Filter options come from `lib/status-config.ts` exports
- Column files: `contact-columns.tsx`, `definition-columns.tsx`, `task-columns.tsx`, `workflow-columns.tsx`

### Working with Workflows
- **Creating a new workflow**: Add to `lib/workflows/` with orchestration logic
- **Defining activities**: Add to `lib/activities/` for DB operations, API calls, emails
- **Starting workflows**: Create API route in `app/api/workflows/` that calls Temporal client
- **Signaling workflows**: API routes that send signals (task completion, form submission)
- **Testing locally**: Run Temporal server locally or use Temporal Cloud dev environment
- **Workflow patterns**: Use signal/wait for external events, activities for I/O operations
- **Durability**: Workflows survive server restarts, can run for hours/days/weeks
- **Builder logic**: V2 builder state management in `lib/workflow-builder-v2/`

### Working with Reusable Components
- `StatusFilter<T>` - Generic status filter (replaces per-entity duplicates)
- `FormDialog` - Reusable dialog wrapper with form boilerplate
- `GenericKanbanBoard<T, S>` - Type-safe kanban board with dnd-kit
- `useDetailDialogEdit<T>` - Hook for detail dialog edit state management
- Status badges: `ContactStatusBadge`, `WorkflowStatusBadge`, `TaskStatusBadge`, `TaskPriorityBadge`

### Styling Guidelines
- Use semantic tokens from `design-tokens.ts` for priority/status/activity colors
- Use animation variants from `motion-variants.ts` for Framer Motion
- Keep Tailwind utilities in order: layout, spacing, color, state
- Follow shadcn/ui patterns for component variants
- Use CSS variables for theme values (defined in globals.css)

## TypeScript Notes
- Strict mode enabled - avoid `any`, lift types to `types/index.ts`
- Use `type` for unions/primitives, `interface` for objects that may be extended
- Status/priority enums are string literal unions, not TypeScript enums
- Badge variants: `"default" | "secondary" | "outline" | "destructive"`

## Important Patterns to Follow
- **Never edit** shadcn/ui components directly (`components/ui/*`)
- **Prefer named exports** over default exports
- **Components use PascalCase**, hooks use `camelCase` with `use` prefix
- **Co-locate** entity-specific logic (columns, components) by domain (contacts, tasks, workflows)
- **Theme all colors** through CSS variables - no hardcoded color values

## Known Gaps & TODOs
- No error boundaries or loading states for some async operations
- Some mock data still used alongside real API routes during transition
