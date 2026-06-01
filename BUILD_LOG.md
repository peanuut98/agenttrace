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

## Product Direction

AgentTrace targets Web3 AI Agent builders who need an honest record of what their Agents actually did. A single Agent run can fan out into multiple LLM calls, tool calls, off-chain payments and on-chain transactions; today none of that is visible to the end user or auditable after the fact.

The product produces two things from each Agent run:

1. **A structured execution trace** — eight well-defined step types, replayable in order, with timestamps, inputs and outputs.
2. **A portable Task Receipt** — a sharable URL (and exportable JSON) that proves what was intended, signed and landed on-chain.

Day 2 turns the mock dashboard into a real per-user workspace. Days 3+ start writing real Agent run data into Supabase and replacing the mock trace timeline.

## Next Step

- **Day 3 plan**:
  - Add `agent_runs` table (RLS gated, parented to `projects`).
  - Enable the now-disabled "Create Agent run" button on `/projects/[id]`.
  - Build `/projects/[id]/runs/new` and `/projects/[id]/runs/[runId]`.
  - Reuse `MockTraceTimeline`'s structure but feed it real step data.
- Still **out of scope** for Day 3: Task Receipt object, AI summary, public share, tx hash parsing.
