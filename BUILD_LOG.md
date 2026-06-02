# BUILD_LOG

## Day 1 — Completed

- Scaffolded the project with `create-next-app` (TypeScript, Tailwind v4, ESLint, App Router, `src/` directory, `@/*` import alias).
- Initialised `shadcn/ui` with the Radix-Nova preset and neutral base color, and installed `lucide-react` for icons.
- Added `shadcn` UI primitives: `Button`, `Card`, `Badge`.
- Built custom components:
  - `Navbar` (`src/components/navbar.tsx`)
  - `FeatureCard` (`src/components/feature-card.tsx`)
  - `MockTraceTimeline` (`src/components/mock-trace-timeline.tsx`) — renders the eight canonical Agent-task steps (intent → plan → tool call → payment request → wallet confirmation → on-chain tx → verification → receipt).
  - `StatsCard` (`src/components/stats-card.tsx`)
- Built three pages:
  - `/` (`src/app/page.tsx`) — hero, feature grid, sample trace.
  - `/login` (`src/app/login/page.tsx`) — placeholder, no real auth.
  - `/dashboard` (`src/app/dashboard/page.tsx`) — stats + latest mock trace.
- Updated the global `RootLayout` to mount the `Navbar` once for every page.
- Wrote `README.md` (intro, positioning, Day 1 features, tech stack, run instructions, roadmap) and this `BUILD_LOG.md`.
- Confirmed `.gitignore` covers `node_modules`, `.next`, `.env*`, `.DS_Store`. Added `.env.example`. No real `.env` was created.
- Initialised git, created the public GitHub repo and pushed the first commit.

## Day 2 — Completed

Goal: stop being a static UI shell. Connect Supabase, get real auth + persistent projects working, protect the routes that matter, and leave Day 3 (Agent Runs) clean.

### Supabase wiring

- Added dependencies: `@supabase/supabase-js`, `@supabase/ssr` (the App-Router-friendly client that handles cookies in Server Components, Client Components, and Route Handlers).
- Created three Supabase client wrappers:
  - `src/lib/supabase/client.ts` — browser client (used in Client Components for sign-in/up, sign-out, and the new-project insert).
  - `src/lib/supabase/server.ts` — Server Component client backed by `next/headers` cookies.
  - `src/lib/supabase/middleware.ts` — middleware client; refreshes the session and gates `/dashboard` + `/projects/*`.
- Added `src/middleware.ts` so every request runs through `updateSession`. Static assets are excluded via the matcher.
- Updated `.env.example` to require `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Confirmed `.gitignore` keeps `.env*` out (`.env.example` is the only env file in the repo).

### Database schema (`supabase/schema.sql`)

- Enabled `pgcrypto` for `gen_random_uuid()`.
- Created `public.projects` with `id, user_id (FK auth.users), name, description, github_url, demo_url, wallet_address, chain, created_at, updated_at`.
- Added two indexes: `(user_id)` and `(user_id, created_at desc)` for the Dashboard sort.
- Added a `set_updated_at()` trigger so updates always bump `updated_at`.
- Enabled RLS and added four policies (`select_own`, `insert_own`, `update_own`, `delete_own`) — all gated on `auth.uid() = user_id`. The script uses `drop policy if exists … create policy …` so it's safe to re-run.

### Auth pages

- Rewrote `/login` (`src/app/login/page.tsx`) as a Server Component that:
  - Reads the current user.
  - Redirects to `/dashboard` (or to the original `?next=…` path) if already signed in.
  - Renders `LoginForm` otherwise.
- New Client Component `LoginForm` (`src/app/login/login-form.tsx`) with:
  - A two-tab toggle for Sign in / Sign up.
  - Email + password fields with `autoComplete` hints.
  - Loading state on the submit button.
  - Error display for Supabase errors.
  - Sign-up branch handles both "session returned immediately" (auto-confirm enabled) and "no session — please confirm email" cases.

### Sign out + Navbar

- Converted `Navbar` to a Server Component that reads `auth.getUser()`. When signed in it shows the user's email and a `SignOutButton`; otherwise it shows the existing "Sign in" CTA.
- New Client Component `SignOutButton` (`src/components/sign-out-button.tsx`) calls `supabase.auth.signOut()`, then `router.push('/login')` + `router.refresh()`.

### Protected routes

- Middleware redirects unauthenticated visitors away from any path under `/dashboard` or `/projects` to `/login?next=<original-path>`.
- `LoginPage` honours `?next` so users land back where they came from.

### Dashboard

- Replaced the mock dashboard with real data. It now:
  - Reads `auth.getUser()` and selects all the user's projects ordered by `created_at desc`.
  - Renders three stats cards: `Projects` (real count), `Agent runs` and `Receipts` (both still `0`, labelled "Coming soon").
  - Shows `EmptyState` when the user has no projects yet, with a "Create project" button pointing to `/projects/new`.
  - Renders a grid of `ProjectCard` (new component) when there are projects.

### `/projects/new`

- New Server Component page wraps a Client Component form (`new-project-form.tsx`).
- Form fields: `name` (required), `description`, `github_url`, `demo_url`, `wallet_address`, `chain`.
- On submit:
  - Reads the current user via the browser client.
  - Inserts into `projects` with `user_id` set to that user id (RLS enforces this independently).
  - On success, navigates to `/projects/<id>` and refreshes the router cache.
  - On failure, shows the error inline and re-enables the form.
- Cancel button navigates back to `/dashboard`.

### `/projects/[id]`

- Server Component that:
  - Validates `id` is a UUID (returns `notFound()` otherwise).
  - Reads the project with `.eq('id', id).maybeSingle()`. RLS already restricts this to rows the current user owns; if the row isn't returned, the page returns 404.
  - Renders all project fields with icons (GitHub / Demo / Wallet / Created).
  - Shows an Agent Runs section with `EmptyState` and a `disabled` "Create Agent run" button (Day 3 territory).

### Shared bits

- Added `src/types/project.ts` with `Project` and `NewProjectInput`.
- Added `src/components/project-card.tsx` and `src/components/empty-state.tsx` for reuse.
- Pulled in shadcn primitives: `Input`, `Label`, `Textarea`.
- Verified `npm run build` passes (TypeScript + ESLint, App Router build, no secrets bundled).

### Out of scope (intentionally)

- Agent Run creation, real Trace Timeline, Task Receipt, AI summary, public share, tx hash parsing — these are explicitly Day 3+.
- No service-role key in the client. All access is via the anon key + RLS.

## Day 2.5 — Completed

Day 2's Supabase email-confirmation flow is still wobbly. Rather than blocking on auth, this slice unblocks product work by making the app runnable without Supabase. Auth code stays — it's just bypassed in Dev Mode.

### Dev Mode flag

- Added `src/lib/dev-mode.ts` exporting `DEV_MODE` (read from `NEXT_PUBLIC_DEV_MODE === "true"`) and `DEV_USER_ID = "dev-user"`.
- Updated `.env.example` to document the new flag.
- `src/lib/supabase/middleware.ts` now short-circuits in Dev Mode — protected routes pass through, no Supabase call.
- `/login` redirects straight to `/dashboard` in Dev Mode.
- `Navbar` renders a "Dev Mode" badge in place of the user-email + sign-out controls when the flag is on.

### Storage adapter

- Added `src/lib/storage.ts` — a thin layer that, in Dev Mode, reads/writes `localStorage` (`agenttrace.projects`, `agenttrace.runs`, `agenttrace.run_steps`); in normal mode, calls Supabase via the existing browser/server clients.
- Browser-side functions: `listProjectsBrowser`, `getProjectBrowser`, `createProjectBrowser`, `listRunsForProjectBrowser`, `createRunWithStepsBrowser`, `getRunBrowser`, `listStepsForRunBrowser`.
- Server-side functions: `getServerUserId`, `listProjectsServer`, `getProjectServer` (used for non-Dev-Mode reads from Server Components — Day 3 wiring).
- Records are timestamped with `crypto.randomUUID()` ids in Dev Mode.

### Types

- `src/types/project.ts` already in place (carried over from Day 2).
- New `src/types/run.ts` with `Run`, `RunStep`, `RunStatus`, `RiskLevel`, `StepStatus`, `StepType`, plus the canonical 8-step `STEP_TEMPLATES` constant and the `RUN_STATUS_OPTIONS / RISK_LEVEL_OPTIONS / STEP_STATUS_OPTIONS` arrays used by the create form.

### Pages

- `/dashboard` rewritten as a thin Server Component that delegates to `DashboardClient` (Client Component). The Client uses `listProjectsBrowser`, so it works for both Dev Mode (localStorage) and Supabase.
- `/projects/[id]` rewritten the same way, delegating to `ProjectDetailClient`. Now reads runs for the project and renders them as `RunCard` grid (or `EmptyState` if none).
- `/projects/[id]/runs/new` — new Server Component page wrapping `NewRunForm`. The form has:
  - `title` and `agent_name` (required), plus `status` and `risk_level` selects.
  - All 8 canonical steps pre-rendered, each with its own status select + content textarea.
  - Submits via `createRunWithStepsBrowser` and navigates to `/runs/<new run id>`.
- `/runs/[id]` — new Server Component page wrapping `RunDetailClient`. Loads the run + steps + parent project from the storage adapter and renders:
  - Run header with `StatusBadge`, `RiskBadge`, agent name, project link, created timestamp.
  - `TraceTimeline` (real component, real data — replaces the mock timeline for run pages).

### Components

- `StatusBadge` and `RiskBadge` (color-coded badges driven by enum string).
- `RunCard` (compact run summary used on the project detail page).
- `TraceTimeline` + `TraceStep` (real timeline driven by `RunStep[]`, replaces what the mock version did for runs).
- Existing `EmptyState`, `ProjectCard`, `StatsCard` reused unchanged.

### Out of scope (intentionally)

- Supabase email-confirmation fix.
- Task Receipt, AI Summary, Public Share, tx-hash parsing.
- Real x402 / MCP / Cobo integrations, payments.
- A Day 3 SQL migration for `runs` and `run_steps` — the storage adapter wires up the Supabase branch already, but the migration itself is Day 3.

### Verified

- `npm run build` passes (TypeScript + ESLint, App Router, Turbopack).
- Dev Mode flow: register-free; localStorage round-trips; refresh keeps data.

## Product Direction

AgentTrace targets Web3 AI Agent builders who need an honest record of what their Agents actually did. A single Agent run can fan out into multiple LLM calls, tool calls, off-chain payments and on-chain transactions; today none of that is visible to the end user or auditable after the fact.

The product produces two things from each Agent run:

1. **A structured execution trace** — eight well-defined step types, replayable in order, with timestamps, inputs and outputs.
2. **A portable Task Receipt** — a sharable URL (and exportable JSON) that proves what was intended, signed and landed on-chain.

Day 2 turns the mock dashboard into a real per-user workspace. Days 3+ start writing real Agent run data into Supabase and replacing the mock trace timeline.

## Next Step

- **Day 3 plan**:
  - Add `runs` and `run_steps` tables to `supabase/schema.sql` with RLS gated to `auth.uid()`.
  - Drop Dev Mode in CI/prod, keep it for local until the Supabase email-confirmation flow is solid.
  - Fix the email-confirmation callback so the round-trip from Supabase email → app actually lands the user signed in.
- Still **out of scope** for Day 3: Task Receipt object, AI summary, public share, tx hash parsing.
