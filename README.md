# AgentTrace

> Audit receipts for every Web3 AI Agent task.

AgentTrace is an execution-trace and audit-receipt platform built for Web3 AI Agent builders. It records the full lifecycle of an Agent task — user intent, execution plan, tool calls, payment requests, wallet confirmations, on-chain transactions, result verification and final output — and turns each run into a shareable Task Receipt that users, auditors and counterparties can inspect.

## Product positioning

- **For**: developers building AI Agents that touch wallets, funds or on-chain state.
- **Why**: Web3 Agent runs span LLM calls, tool calls, wallet signatures and on-chain effects. When something goes wrong (or right), there's no clean record of what actually happened.
- **What AgentTrace does**: provides a structured, replayable trace per Agent run and a portable Task Receipt that proves what was attempted, what was signed and what landed on-chain.

## What's done

### Day 1 — UI foundation

- Next.js + TypeScript + Tailwind + shadcn/ui (Radix-Nova) scaffolding.
- Landing page with hero + sample trace timeline.
- Static `/login` placeholder.
- Static `/dashboard` with mock stats and a mock 8-step trace.
- Reusable components: `Navbar`, `FeatureCard`, `MockTraceTimeline`, `StatsCard`.

### Day 2 — Supabase auth + projects

- Supabase Auth wired in via `@supabase/ssr` (cookie-based session, works in both Server and Client Components).
- Real email/password sign-in **and** sign-up on `/login`, with tab toggle, loading state, and error display.
- Sign-out button in the navbar (only shown when signed in; shows the user's email).
- `middleware.ts` refreshes the Supabase session on every request and redirects unauthenticated visitors away from `/dashboard` and `/projects/*`.
- `projects` table in Postgres with full Row Level Security — every SELECT/INSERT/UPDATE/DELETE is gated on `auth.uid() = user_id`.
- `/dashboard` reads the current user's projects, shows an empty state when there are none, and renders `ProjectCard`s otherwise.
- `/projects/new` creates a project (writes `user_id = auth.uid()` automatically thanks to RLS + the form passing the current user id).
- `/projects/[id]` shows project detail and a placeholder Agent Runs section with a disabled "Create Agent run" button.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- React 19 + TypeScript 5
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Supabase](https://supabase.com) — Auth + Postgres
- [`@supabase/ssr`](https://supabase.com/docs/guides/auth/server-side/nextjs) for App Router cookie sessions

## Run locally

Requires Node.js 20.9+.

### 1. Install dependencies

```bash
git clone https://github.com/peanuut98/agenttrace.git
cd agenttrace
npm install
```

### 2. Create a Supabase project

1. Go to <https://supabase.com> and create a new project.
2. From the Supabase dashboard, open **Project Settings → API** and copy:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon / public** key
3. Copy `.env.example` to `.env.local` and paste both values:

   ```bash
   cp .env.example .env.local
   ```

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

   `.env.local` is git-ignored. Never commit real keys.

### 3. Apply the database schema

Open the Supabase SQL editor for your project and run the contents of [`supabase/schema.sql`](./supabase/schema.sql). It is idempotent — safe to re-run. The script:

- Enables `pgcrypto` (for `gen_random_uuid()`).
- Creates the `projects` table with foreign key to `auth.users`.
- Creates an `updated_at` trigger.
- Enables Row Level Security with four policies (select/insert/update/delete) so users can only access rows where `auth.uid() = user_id`.

### 4. Start the dev server

```bash
npm run dev
```

Then open <http://localhost:3000>.

Useful scripts:

```bash
npm run dev     # start the dev server (Turbopack)
npm run build   # production build
npm run start   # run the production build
npm run lint    # run ESLint
```

## Roadmap

- **Day 3** — Agent Run creation: a real form to log a single Agent task and persist it.
- **Day 4** — Trace Timeline backed by real run data (replaces the mock timeline).
- **Day 5** — Task Receipt object: shareable URL, JSON export, hash for verification.
- **Day 6** — AI Summary of a run.
- **Day 7+** — Public share page, real chain integrations, signature verification.

## Notes

- No real `.env` files are committed; only `.env.example`.
- `.gitignore` covers `node_modules`, `.next`, `.env*` (except `.env.example`), `.DS_Store`.
- All Supabase access in this app uses the **anon key**. Authorization is enforced by RLS, not by the client.
