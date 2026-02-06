# Repository Guidelines

## Project Structure & Module Organization
Byte Dashboard lives in `frontend/`, a Next.js 16 App Router workspace. Routes stay inside `app/` route groups, while reusable UI primitives and data tables are in `components/`. Hooks (`hooks/`), helpers (`lib/` plus `lib/data/*`), and models (`types/`) keep business logic reusable. Static assets reside in `public/`. Config lives in `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, and `components.json`, and `middleware.ts` wires Clerk authentication for protected routes.

## Build, Test, and Development Commands
Install dependencies once with `cd frontend && npm install`. Use `npm run dev` for the local server at http://localhost:3000. `npm run build` compiles production assets and fails on route or type errors. `npm start` runs the compiled output for smoke checks, and `npm run lint` executes ESLint 9 with the Next config plus Tailwind rules.

## Coding Style & Naming Conventions
TypeScript strict mode is enforced; avoid `any` by lifting shapes into `types/`. Components are PascalCase, hooks are camelCase starting with `use`, and route folders mirror their URL path in kebab-case. Keep 2-space indentation, prefer named exports, and import via the `@/*` alias instead of deep relative paths. Keep Tailwind utilities ordered (layout, spacing, color, state) and route all theme toggles through `ThemeProvider`.

## Testing Guidelines
Automated tests are not yet committed, so prioritize adding React Testing Library or Vitest specs alongside the feature (e.g., `components/Card.test.tsx`). Co-locate integration specs in `app/__tests__/` when validating server actions or middleware redirects. For now, run `npm run dev`, seed scenarios with `lib/data/`, and verify drag-and-drop, filters, and Clerk-protected flows in multiple themes.

## Commit & Pull Request Guidelines
Recent history uses full-sentence, present-tense summaries (e.g., “Refactor dashboard components to enhance user experience…”). Follow that model: start with an imperative verb, call out the scope, and add the reason when relevant. Pull requests should include a concise description, linked issue or ticket, a test checklist (`npm run lint`, manual pages exercised), and screenshots for visual tweaks. Mention any new env vars or migrations under a “Deployment” note.

## Security & Configuration Tips
Store secrets (Clerk keys, API tokens) in `.env.local` and document them in the PR description when they change; never commit the file. After updating secrets, restart `npm run dev` because Next caches env values. Audit new dependencies with `npm audit --production` before release and confirm Clerk webhook URLs whenever routes are added.
