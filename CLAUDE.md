# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands are run from the project root:

- `npm install` - Install dependencies (required once)
- `npm run dev` - Start development server at http://localhost:3000
- `npm run build` - Build for production (fails on route or type errors)
- `npm start` - Run compiled production build for smoke testing
- `npm run lint` - Run ESLint 9 with Next.js config
- `npm run db:generate` - Generate Drizzle migrations from schema
- `npm run db:migrate` - Run pending database migrations
- `npm run db:push` - Push schema changes directly to database
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## Reference Documents

Reference documents for this project are created and read in the `context/` folder. This includes architecture documentation, roadmaps, schema definitions, and other planning artifacts.

## Project Structure

Byte Dashboard is a Next.js 16 App Router application using TypeScript strict mode, Tailwind CSS v4, and Clerk authentication.

```
byte-dashboard/
├── app/                         # Next.js App Router
│   ├── (dashboard)/            # Route group with shared dashboard layout
│   │   ├── layout.tsx          # Sidebar + top navigation wrapper
│   │   ├── dashboard/          # Main dashboard view
│   │   ├── applications/       # Application management
│   │   ├── people/             # Contact/people management
│   │   ├── tasks/              # Task management
│   │   ├── my-work/            # Personal work view
│   │   ├── calendar/           # Calendar view
│   │   ├── support/            # Support section
│   │   └── admin/              # Admin section
│   │       ├── settings/       # Settings with tab-based sub-navigation
│   │       │   ├── layout.tsx  # Shared tabs for all settings pages
│   │       │   ├── general/    # General workspace settings
│   │       │   ├── billing/    # Billing & plans
│   │       │   ├── users/      # Users & permissions
│   │       │   ├── integrations/
│   │       │   ├── audit/      # Audit logs
│   │       │   ├── crm/        # CRM-specific settings
│   │       │   └── customizations/
│   │       └── workflow-*/     # Workflow management tools
│   ├── api/                    # Next.js API routes
│   │   ├── webhooks/           # Webhook handlers (Formstack, etc.)
│   │   └── workflows/          # Workflow trigger endpoints
│   ├── globals.css             # Tailwind v4 imports + CSS variables
│   └── layout.tsx              # Root layout with theme provider
├── components/
│   ├── ui/                     # shadcn/ui components (Radix primitives)
│   ├── layout/                 # app-sidebar, page-header
│   ├── data-table/             # Reusable DataTable with TanStack Table
│   │   ├── data-table.tsx
│   │   ├── data-table-toolbar.tsx
│   │   ├── data-table-pagination.tsx
│   │   └── columns/            # Column definitions by entity
│   ├── applications/           # Application-specific components
│   ├── contacts/               # Contact-specific components
│   ├── tasks/                  # Task-specific components
│   ├── kanban/                 # Kanban board with dnd-kit
│   ├── dashboard/              # Dashboard widgets
│   ├── detail/                 # Detail page components
│   └── common/                 # Shared presentational components
├── lib/
│   ├── data/                   # Mock data for development
│   │   ├── applications.ts
│   │   ├── contacts.ts
│   │   ├── tasks.ts
│   │   ├── activity.ts
│   │   └── settings.ts
│   ├── db/                     # Database layer (Drizzle)
│   │   ├── index.ts            # DB connection
│   │   ├── schema.ts           # Drizzle schema
│   │   └── queries.ts          # Reusable queries
│   ├── workflows/              # Temporal workflows
│   │   ├── application-review.ts
│   │   └── background-check.ts
│   ├── activities/             # Temporal activities
│   │   ├── database.ts         # DB operations
│   │   ├── email.ts            # Email sending
│   │   └── integrations.ts     # External API calls
│   ├── temporal/               # Temporal setup
│   │   ├── client.ts           # Temporal client
│   │   └── worker.ts           # Temporal worker
│   ├── validations/            # Zod schemas
│   ├── design-tokens.ts        # Semantic color mappings (priority, status, activity, trend)
│   ├── status-config.ts        # Badge variants for statuses/priorities
│   └── utils.ts                # Utility functions (cn, etc.)
├── types/
│   └── index.ts                # TypeScript types for all domain models
├── hooks/                      # Custom React hooks
├── middleware.ts               # Clerk authentication (DELETED in current state)
├── drizzle.config.ts           # Drizzle Kit configuration
├── package.json
├── tsconfig.json
├── next.config.ts
└── .env.local

# Future: Temporal workers (separate deployment to Railway)
workers/                        # Will be added when implementing Temporal
├── src/
│   └── worker.ts
├── package.json
└── tsconfig.json
```

## Architecture & Key Patterns

### 1. Route Organization
- All dashboard routes live inside `app/(dashboard)/` route group which provides the sidebar layout
- Settings pages use nested layout (`admin/settings/layout.tsx`) for tab navigation
- Use kebab-case for route folder names (e.g., `/my-work`, `/workflow-blueprints`)

### 2. Authentication
- Clerk handles authentication via `@clerk/nextjs`
- `useUser()` and `useClerk()` hooks provide user data and sign-out functionality
- Admin check is currently a placeholder in `app-sidebar.tsx:44` - returns `true` for all users
- Middleware.ts has been deleted; restore or recreate if route protection is needed

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
- Use `cn()` utility from `lib/utils.ts` for conditional class merging
- Theme switching via `ThemeProvider` with `next-themes`
- Maintain Tailwind class order: layout → spacing → color → state

### 6. Data & State Management
- Mock data in `lib/data/*` for development (current state)
- Application data will be in PostgreSQL via Drizzle (not yet implemented)
- Workflow state managed by Temporal's persistence layer
- Client state via TanStack React Query (not yet implemented)
- Use React Server Components where possible; opt into client components with `"use client"`

### 7. Workflow Orchestration
- **Temporal.io** handles long-running, durable workflows
- Workflows defined in `lib/workflows/` - orchestration logic only
- Activities defined in `lib/activities/` - actual work (DB, API calls, emails)
- Workflows started via API routes (`app/api/workflows/`)
- Workflows signaled from UI (task completion, form submission)
- Can wait hours/days/weeks for external events (form submissions, webhooks, user actions)
- `workflow_templates` table stores UI metadata (statuses, colors, labels), Temporal handles execution

### 8. Path Aliases
- `@/*` resolves to `frontend/*` (configured in tsconfig.json)
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

### Working with Forms
- Use shadcn/ui form primitives (Input, Select, Textarea, etc.)
- Validation not yet implemented - add React Hook Form or Zod when needed
- Form submissions currently have no backend - plan API integration

### Working with Data Tables
- Column definitions live in `components/data-table/columns/`
- Use `DataTable` component with `DataTableToolbar` and `DataTablePagination`
- Filter options come from `lib/status-config.ts` exports
- Example: `applications-columns.tsx`, `contacts-columns.tsx`

### Working with Workflows
- **Creating a new workflow**: Add to `lib/workflows/` with orchestration logic
- **Defining activities**: Add to `lib/activities/` for DB operations, API calls, emails
- **Starting workflows**: Create API route in `app/api/workflows/` that calls Temporal client
- **Signaling workflows**: API routes that send signals (task completion, form submission)
- **Testing locally**: Run Temporal server locally or use Temporal Cloud dev environment
- **Workflow patterns**: Use signal/wait for external events, activities for I/O operations
- **Durability**: Workflows survive server restarts, can run for hours/days/weeks

### Styling Guidelines
- Use semantic tokens from `design-tokens.ts` for priority/status/activity colors
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
- **Co-locate** entity-specific logic (columns, components) by domain (applications, contacts, tasks)
- **Theme all colors** through CSS variables - no hardcoded color values

## Known Gaps & TODOs
- Admin role check is hardcoded to `true` in `app-sidebar.tsx:44`
- `middleware.ts` deleted - restore for Clerk route protection
- No automated tests - add React Testing Library or Vitest when writing new features
- No backend integration - all data is static from `lib/data/*`
- Form validation not implemented
- No error boundaries or loading states for async operations
