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

## Day 3 — Completed

Goal: turn each Agent Run into a structured, hashable receipt + a Markdown export. No new external services, no AI, no public share — all generation happens in the browser, all persistence goes through the existing storage adapter.

### Types

- `src/types/receipt.ts` — new file. Defines:
  - `ReceiptJson` — versioned payload with `project` / `run` / `execution_trace` / `web3_context` / `verification` / `metadata`. The `execution_trace` exposes named slots (one per canonical step) and uses `mcp_tool_calls` instead of `tool_calls` so MCP semantics are explicit in the receipt.
  - `ReceiptStep` — `{step_type, title, status, content, metadata?}`.
  - `Receipt` — the persisted record (`id, run_id, project_id, receipt_json, receipt_hash, markdown_export, created_at, updated_at`).
  - `RECEIPT_VERSION = "0.1.0"` constant — bumped whenever the JSON shape changes.
- `src/types/run.ts` — added optional `metadata` to `RunStep` plus a `StepMetadata` shape (`mcp_server`, `tool_name`, `tool_input_summary`, `tool_output_summary`, `latency_ms`, free-form passthrough). Backwards-compatible: existing runs without `metadata` keep working.

### Generation (`src/lib/receipt.ts`)

Pure functions, no side effects:

- `generateReceiptJson(run, project, steps)` — sorts steps by `order_index`, slots them into the named trace fields, copies project + run scalars, and pulls a `transaction_hash` for `web3_context` from the on-chain step (`metadata.transaction_hash` first, then `metadata.tx_hash` / `txHash` / `hash`, then a regex over `step.content` for `0x[a-fA-F0-9]{64}`).
- `generateReceiptHash(json)` — SHA-256 via Web Crypto (`crypto.subtle.digest`), produced over a canonical stringification (recursively sorted keys) so the same logical receipt always hashes the same. Returns `sha256:<hex>`. No new dependency.
- `generateMarkdownExport(json, hash)` — produces the human-readable report. The MCP / Tool Calls section auto-prepends MCP-related metadata fields (`MCP Server`, `Tool`, `Input`, `Output`, `Latency`) when they exist; otherwise only the step content is rendered.
- `buildReceipt(run, project, steps)` — convenience: returns `{run_id, project_id, receipt_json, receipt_hash, markdown_export}` ready for storage.

### Storage

- `src/lib/storage.ts` adds:
  - `getReceiptForRunBrowser(runId)` — single-receipt lookup.
  - `saveReceiptBrowser(input)` — upserts on `run_id` (one receipt per run; regenerate overwrites).
  - In Dev Mode both functions read/write the new localStorage key `agenttrace.receipts`. Existing `projects/runs/run_steps` keys untouched.
  - The Supabase branch (used when `NEXT_PUBLIC_DEV_MODE=false`) upserts into a `receipts` table on conflict `run_id`. The migration for that table is Day 4 — wired up here so flipping Dev Mode off later requires no extra code change.

### UI

- New component `src/components/receipt-panel.tsx`:
  - Loads any existing receipt on mount.
  - Generate / Regenerate button with loading state.
  - Hash shown as a copyable `Badge` (`sha256:…`).
  - Collapsible JSON view (`<pre>`) + Copy JSON.
  - Markdown export view (`<pre>`) + Copy Markdown.
  - Toast feedback (success / error) auto-dismisses after ~3.5s.
  - All copying goes through `navigator.clipboard.writeText`.
- `src/app/runs/[id]/run-detail-client.tsx` mounts `<ReceiptPanel />` below the trace timeline (only when the parent project is loaded).
- Visual style consistent with Day 2.5: `Card` shell, neutral muted backgrounds, monospace inline for hash + code blocks.

### MCP-aware behaviour

- If a `RunStep` has `metadata = { mcp_server, tool_name, tool_input_summary, tool_output_summary, latency_ms, … }`, those fields appear:
  - In the JSON receipt as `execution_trace.mcp_tool_calls.metadata`.
  - In the Markdown export as `- MCP Server: …`, `- Tool: …`, etc., before the step content.
- If `metadata` is missing or empty, the receipt simply uses `step.content`. No breakage for runs created before Day 3.

### Out of scope (intentionally)

- AI Summary of the run.
- Public share page or shareable URL gating.
- Real MCP SDK integration / real x402 / real Stripe.
- Tx-hash auto-parsing beyond the regex fallback (no chain RPC calls).
- Supabase email-confirmation fix.

### Verified

- `npm run build` passes (TypeScript + ESLint, App Router + Turbopack).
- Dev Mode: generate → hash + JSON + Markdown render; copy buttons populate clipboard; refresh keeps the receipt; regenerate overwrites in place.

## Day 4 — Completed

Goal: make every run explainable. Add an AI Summary that builds on the Day 3 receipt JSON, surface MCP / Tool Calls metadata in the timeline, and give a one-click demo so reviewers can see what the product produces without filling out two forms.

### AI Summary

- New server-only route `src/app/api/ai-summary/route.ts`. Accepts `{receipt_json}` and returns a `ReceiptAiSummary`. The `AI_API_KEY` is read on the server only — never reaches the client bundle.
- New `src/lib/ai-summary.ts` (`import "server-only"`):
  - `generateAiSummary(receiptJson, options)` is the single entrypoint. If `AI_API_KEY` is missing it returns a mock summary. If the key is present it calls the Anthropic Messages API with a strict-JSON system prompt; on any upstream failure it falls back to the mock so the UI never errors.
  - Default model `claude-haiku-4-5-20251001`. Overridable via `AI_MODEL`.
  - Mock path is deterministic — pulls intent, MCP fields, payment / wallet / on-chain / verification content from the receipt JSON.
- `.env.example` documents `AI_API_KEY` + `AI_MODEL` and explicitly says blank is fine (mock fallback).

### Receipt type changes

- `ReceiptAiSummary = {run_summary, technical_flow, audit_notes, source, generated_at}` added in `src/types/receipt.ts`.
- `Receipt` now includes `ai_summary: ReceiptAiSummary | null`.
- `lib/storage.ts`:
  - New `updateReceiptSummaryBrowser(runId, summary)` — writes the AI summary onto the existing receipt (one summary per run).
  - `saveReceiptBrowser` now resets `ai_summary` to `null` on regeneration so a stale summary never describes a newer receipt.
  - Localstorage key remains `agenttrace.receipts`.

### MCP-aware Trace Timeline

- `RunStep` already had optional `metadata` (Day 3). `NewRunStepInput` and `createRunWithStepsBrowser` now persist it through both the Dev Mode and Supabase branches, so creation flows can attach MCP / tx-hash data.
- `src/components/trace-step.tsx`:
  - When the `tool_calls` step has any of `mcp_server`, `tool_name`, `tool_input_summary`, `tool_output_summary`, `latency_ms`, the timeline renders a structured `<dl>` card above the content.
  - Steps without metadata fall back to the existing content rendering — no breakage for older runs.

### Run Detail page

- `src/app/runs/[id]/run-detail-client.tsx` now owns the `Receipt` state and passes it down to both panels:
  - `ReceiptPanel` is now controlled (`receipt`, `onReceiptChange`).
  - `SummaryPanel` reads the same receipt and writes the `ai_summary` back via `updateReceiptSummaryBrowser`.
  - Both panels stay in sync without a refetch.
- `SummaryPanel` (`src/components/summary-panel.tsx`):
  - `Generate AI summary` / `Regenerate AI summary` button.
  - "Generate a receipt first" empty state when there's no receipt yet.
  - Renders the three sections (Run summary, Technical flow, Audit notes) with icons.
  - Source badge — `AI generated` (emerald) vs `Mock summary` (amber). When mock, shows a one-line disclaimer that `AI_API_KEY` is not configured.
  - Toast feedback (success / error) auto-dismisses after ~3.5s.

### Demo data

- New `src/lib/demo-data.ts`:
  - `loadDemoProject()` creates the Day 4 demo project (`Agent Payment Demo` on Base Sepolia, wallet `0x1234…5678`) and a fully populated run (`Wallet Risk Analysis with Paid Data API`) with all 8 canonical steps. The tool-calls step carries MCP metadata; the on-chain step carries a `transaction_hash`.
  - Uses the existing `createProjectBrowser` / `createRunWithStepsBrowser` adapters, so it works in both Dev Mode and Supabase mode.
- Dashboard empty-state now offers a `Load demo project` button next to `Create project`. Click → demo is written → router pushes straight to the demo run's detail page.

### UI polish

- Empty-state CTA layout updated for two buttons.
- Receipt + AI summary panels stacked under the Trace timeline with consistent spacing.
- MCP metadata renders as a `<dl>` grid (label / monospace value), not a code block, so it reads as structured data.

### Out of scope (intentionally)

- Public share page for receipts.
- Real MCP SDK or x402 integration.
- Real chain RPC calls or tx-hash auto-resolution beyond the Day 3 regex fallback.
- Stripe / payments.
- Supabase email-confirmation fix.
- Team / org permissions.

### Verified

- `npm run build` passes (TypeScript + ESLint, App Router + Turbopack); the new `/api/ai-summary` route shows up in the route table.
- `npm run lint` clean.
- Dev Mode: load demo → see MCP metadata card in the timeline; generate receipt → hash + JSON + Markdown all populate; generate AI summary without `AI_API_KEY` → renders with `Mock summary` badge + disclaimer; refresh keeps everything; regenerating the receipt clears the AI summary so the next click rebuilds it from the fresh JSON.

## Product Direction

AgentTrace targets Web3 AI Agent builders who need an honest record of what their Agents actually did. A single Agent run can fan out into multiple LLM calls, tool calls, off-chain payments and on-chain transactions; today none of that is visible to the end user or auditable after the fact.

The product produces two things from each Agent run:

1. **A structured execution trace** — eight well-defined step types, replayable in order, with timestamps, inputs and outputs.
2. **A portable Task Receipt** — a sharable URL (and exportable JSON) that proves what was intended, signed and landed on-chain.

Day 2 turns the mock dashboard into a real per-user workspace. Days 3+ start writing real Agent run data into Supabase and replacing the mock trace timeline.

## Next Step

- **Day 5 plan**:
  - Add `runs`, `run_steps`, and `receipts` tables to `supabase/schema.sql` with RLS gated to `auth.uid()`. Receipts FK to `runs(id)`; runs FK to `projects(id)`. `receipts.ai_summary` jsonb. Drop the localStorage fallback for users who flip Dev Mode off.
  - Fix the Supabase email-confirmation round-trip (Site URL + Redirect URL config + the `/auth/callback` handler) so non-Dev-Mode signed-in flows actually land.
- Still **out of scope** for Day 5: public share, tx hash auto-parsing via RPC, real MCP SDK, payments.
