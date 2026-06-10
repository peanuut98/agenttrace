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
  - Two-tab toggle (Sign In / Sign Up).
  - Email + password inputs.
  - Loading state, error state, and `success` state (shown briefly before the redirect).
  - Real calls to `signInWithPassword` and `signUp` via the Supabase browser client.
  - Redirects to the originally requested page after sign-in (via the `?next=…` param).

### Auth in the navbar

- `Navbar` loads the current user in a `useEffect`.
- If signed in, shows the user's email and a sign-out button.
- If signed out, shows a "Sign in" link that points to `/login` with the current path as `?next=…`.
- All state is local to the navbar. No global provider.

### Auth flow

- Real email/password sign-up → sends confirmation email.
- New `/auth/callback` route handler exchanges the `code` query param for a session and redirects to `/dashboard`.
- Sign-in works immediately (no email confirmation required if already confirmed).
- Sign-out clears the session and redirects to `/`.
- Middleware refreshes the session on every request and redirects unauthenticated users away from `/dashboard` and `/projects/*`.

### Projects

- Real `/dashboard` (`src/app/dashboard/page.tsx`):
  - Server Component that reads the user from Supabase.
  - If not signed in, redirects to `/login?next=/dashboard`.
  - If signed in, fetches that user's projects from Postgres via RLS.
  - Shows stats cards (Projects, Agent Runs, Receipts) all hardcoded to `0` for now.
  - Shows the list of projects as `ProjectCard` or an `EmptyState` CTA.
- `/projects/new` (`src/app/projects/new/page.tsx`):
  - Client Component with a multi-field form.
  - Fields: name (required), description, GitHub URL, demo URL, wallet address, chain (select).
  - On submit: inserts into the `projects` table via the Supabase client.
  - Displays loading + error state.
  - Redirects to `/projects/[id]` on success.
- `/projects/[id]` (`src/app/projects/[id]/page.tsx`):
  - Server Component that reads the project by ID.
  - If not found, redirects to `/dashboard` with `toast=not_found`.
  - If found, shows project details (name, description, wallet, chain, GitHub, demo, created/updated timestamps).
  - Placeholder for "Agent Runs" section (hardcoded to zero).
- `src/types/project.ts` — TypeScript definition for `Project`.

### Summary

Supabase auth + RLS-backed projects is wired end-to-end. Email confirmation is sent; the `/auth/callback` route handler completes the loop. Protected routes redirect to `/login` when unauthenticated. Project list, create, and detail pages are live. Day 3 will add Agent Runs + Steps, also persisted to Supabase.

## Day 2.5 — Completed (Dev Mode + Agent Run flow)

The Supabase email-confirmation flow is still being sorted out. To unblock product work, this build adds a **Dev Mode** that bypasses auth entirely and persists everything to `localStorage` instead.

### Dev Mode

- New env flag `NEXT_PUBLIC_DEV_MODE`. When `true`:
  - Middleware no longer protects `/dashboard`, `/projects/*`, or `/runs/*`.
  - `/login` redirects straight to `/dashboard`.
  - The navbar shows a `Dev Mode` badge instead of the auth CTA.
  - All reads/writes go through `lib/storage.ts`, which uses `localStorage` keyed by `agenttrace.projects` / `agenttrace.runs` / `agenttrace.run_steps`.
  - The current user is the constant `dev-user`.
- Switching Dev Mode on:
  - In `.env.local`: `NEXT_PUBLIC_DEV_MODE=true`
  - Restart `npm run dev`. The Supabase keys can stay blank in Dev Mode — they aren't read.
- **Important:** Dev Mode is for local development only. Set `NEXT_PUBLIC_DEV_MODE=false` (or remove the line) before shipping to production. With it on, anyone hitting `/dashboard` is treated as the same `dev-user` and Supabase RLS is bypassed entirely.

### Real Project Management

- `/dashboard` lists the current user's projects, with empty state and create CTA.
- `/projects/new` creates projects (name required; description / GitHub / demo / wallet / chain optional).
- `/projects/[id]` shows project detail and that project's runs.

### Real Agent Run flow

- `/projects/[id]/runs/new` creates a run with all 8 canonical steps in one form:
  - User Intent → Agent Plan → Tool Calls → Payment Request → Wallet Approval → On-chain Transaction → Verification → Final Result.
  - Each step has its own status (`success / warning / failed / skipped`) and content.
- `/runs/[id]` shows the run with a real `TraceTimeline` driven by the captured steps, plus a link back to the parent project.

### New components

- `ProjectCard`, `RunCard`, `TraceTimeline`, `TraceStep`, `EmptyState`, `StatusBadge`, `RiskBadge`.

### Types

- `types/project.ts`, `types/run.ts` (with `STEP_TEMPLATES`, `RUN_STATUS_OPTIONS`, `RISK_LEVEL_OPTIONS`, `STEP_STATUS_OPTIONS`).

## Day 3 — Completed (Task Receipt + Markdown Export)

Each Agent Run can now produce a versioned, hashable receipt and a Markdown report.

- New types in `src/types/receipt.ts`: `ReceiptJson`, `ReceiptStep`, `ReceiptExecutionTrace`, `Receipt`, plus a `RECEIPT_VERSION` constant (currently `0.1.0`).
- `src/lib/receipt.ts` — pure functions for generation:
  - `generateReceiptJson(run, project, steps)` builds the structured payload (project / run / 8-step `execution_trace` / `web3_context` / `verification` / `metadata`). The "Tool Calls" step is exposed as `mcp_tool_calls` so MCP usage is first-class.
  - `generateReceiptHash(json)` returns `sha256:<hex>` over the canonical (sorted-keys) JSON via Web Crypto. No extra deps.
  - `generateMarkdownExport(json, hash)` produces the human-readable export.
  - `buildReceipt(run, project, steps)` is the convenience wrapper that returns `{receipt_json, receipt_hash, markdown_export}` ready for storage.
- MCP-aware: if a step has `metadata` with `mcp_server`, `tool_name`, `tool_input_summary`, `tool_output_summary`, or `latency_ms`, those fields are surfaced in both the JSON receipt and the Markdown export. If `metadata` is missing, only `step.content` is shown — no breakage.
- `transaction_hash` is auto-extracted from the on-chain step (`metadata.transaction_hash` first, otherwise the first `0x[64 hex]` substring in the step content).
- Storage: `getReceiptForRunBrowser(runId)` and `saveReceiptBrowser(input)` in `src/lib/storage.ts`. In Dev Mode, receipts live under the `agenttrace.receipts` localStorage key. The Supabase branch upserts on `run_id`.
- New `ReceiptPanel` on `/runs/[id]`:
  - "Generate receipt" / "Regenerate receipt" button.
  - Receipt hash shown as a `Badge`, with Copy.
  - JSON receipt in a collapsible `<pre>` block, with Copy JSON.
  - Markdown export in a `<pre>` block, with Copy Markdown.
  - Toast feedback on success / error; auto-clears.
  - Existing receipts are loaded automatically when the page is opened.

## Day 4 — Completed (AI Summary, MCP-aware UI, Demo data, Transaction-to-Trace)

A receipt is now also explainable. Every run can produce a three-section AI summary (Run Summary / Technical Flow / Audit Notes) directly from the receipt JSON.

**Transaction-to-Trace (Alpha)**: Users can now import agent runs from existing blockchain transactions. Enter a transaction hash, and AgentTrace automatically fetches transaction data and uses AI to generate the full 8-step execution timeline, task receipt, and audit report.

- **Server-only AI route** at `src/app/api/ai-summary/route.ts`. The `AI_API_KEY` is read on the server only and never reaches the browser.
- **`src/lib/ai-summary.ts`** with two paths:
  - **AI path**: when `AI_API_KEY` is set, calls the Anthropic Messages API with a strict-JSON system prompt. Default model is `claude-haiku-4-5-20251001`; override with `AI_MODEL`.
  - **Mock path**: when the key is missing _or_ the upstream call throws, builds a deterministic summary from the receipt JSON (intent + tool calls + payment / wallet / on-chain / verification + status / risk). The UI gets a uniform `ReceiptAiSummary` either way and shows a `Mock summary` badge plus a small disclaimer when the mock path is taken.
- **Transaction-to-Trace feature**:
  - **`src/lib/web3/transaction.ts`**: fetches transaction context from blockchain explorers (Base Sepolia, Ethereum Sepolia). Falls back to mock data when `NEXT_PUBLIC_BASESCAN_API_KEY` or `NEXT_PUBLIC_ETHERSCAN_API_KEY` is not configured.
  - **`src/lib/ai-transaction-trace.ts`**: AI-powered transaction analyzer that generates structured 8-step timelines from transaction data. Uses `claude-sonnet-4-6-20250402` by default. Falls back to mock generator when `AI_API_KEY` is not set.
  - **`/projects/[id]/runs/import-transaction`**: new import page where users enter chain + transaction hash + optional user intent/agent name. Clicking "Analyze Transaction" fetches transaction data, generates the timeline via AI, creates the run with 8 steps, auto-generates receipt, and redirects to run detail.
  - **"Create from Transaction" button** added to project detail page alongside the manual "Create Agent run" button.
  - **Run detail enhancements**: runs imported from transactions display a "Generated from Transaction" badge, transaction hash with explorer link, chain, and analysis source (AI vs Mock).
  - **Receipt integration**: transaction context is embedded in receipt JSON metadata and markdown export, including transaction hash, chain, status, explorer link, and data source.
- **`Receipt` gains `ai_summary`** (`run_summary`, `technical_flow`, `audit_notes`, `source: "ai" | "mock"`, `generated_at`). Regenerating the underlying receipt invalidates the prior summary so it always reflects the current snapshot.
- **`SummaryPanel`** mounts on `/runs/[id]` below the `ReceiptPanel`:
  - Tells the user to generate a receipt first when there isn't one.
  - "Generate AI summary" / "Regenerate AI summary" with loading state and toast feedback.
  - Renders the three sections with icons and a source badge (AI vs Mock).
- **MCP-aware Trace Timeline**: the `tool_calls` step now renders a structured key/value card whenever `metadata` carries `mcp_server`, `tool_name`, `tool_input_summary`, `tool_output_summary`, or `latency_ms`. Steps without metadata fall back to the existing content rendering.
- **Demo project loader**: the empty-state on `/dashboard` gains a `Load demo project` button. It writes a fully-populated demo project + run (`Wallet Risk Analysis with Paid Data API` on Base Sepolia, with MCP metadata on the tool-calls step and a transaction hash on the on-chain step) and routes to the project detail page (updated to show runs list).
- **Dashboard stats**: the stats cards now show real counts from localStorage/Supabase for Projects, Agent Runs, and Receipts (previously hardcoded to 0).
- **`NewRunStepInput` and the run insert path** now persist optional `metadata`, so any future creation flow can attach MCP / tx-hash metadata without another migration.
- **`Run` type gains `metadata`** field to store transaction import context (transaction_hash, chain, analysis_source, generated_from_transaction flag).

## Day 5 — Completed (Public Proof-of-Execution Share Page)

Agent Runs can now be made public and shared via a public link. Each public run gets a shareable proof-of-execution report that can be viewed by anyone without authentication — perfect for hackathon submissions, DevRel demos, and audit reviews.

- **Public sharing controls** on `/runs/[id]`:
  - "Make Public" button generates a unique public link
  - "Copy Link" button with visual feedback
  - "View Public Page" opens the public report in a new tab
  - "Unpublish" removes public access
- **Public ID generation**: each public run gets a stable, random `public_id` (format: `trace_<uuid>`) that doesn't expose internal database IDs
- **Public trace page** at `/trace/[publicId]`:
  - No authentication required
  - Professional, external-facing report layout
  - Displays: Executive Summary, Project Context, Execution Timeline, MCP/Tool Call Evidence, Transaction Context, AI Audit Report, Task Receipt
  - Clean footer: "This proof-of-execution report was generated by AgentTrace"
  - Mobile-friendly responsive design
- **Run type enhancements**: added `is_public`, `public_id`, `published_at` fields with backward compatibility for existing runs
- **Storage functions**: `updateRunPublicStatusBrowser(runId, isPublic, publicId)` and `getPublicRunBrowser(publicId)` for managing public runs
- **Use cases**:
  - Hackathon judges can review agent execution without accessing the dashboard
  - DevRel teams can share agent traces in documentation
  - Builders can prove on-chain transactions came from their agent workflow
  - Audit trails for compliance and transparency

## Day 6 — Completed (Public Report Polish and Demo Shortcut)

The Public Proof-of-Execution Report page is now a polished, externally-shareable artifact suitable for hackathon submissions and DevRel demos. Plus a one-click "Generate Demo Report" shortcut so reviewers can experience the full flow without filling out forms.

### Public Report Polish (`/trace/[publicId]`)

The report is now structured for 30-second scanning by external reviewers:

- **Report Header** with title "AgentTrace Proof-of-Execution Report", a dynamic subtitle, and badges:
  - Generated by AgentTrace
  - Generated by AI Provider (when AI report is real) / Mock AI Report (when fallback)
  - Generated from Transaction (when run came from Transaction-to-Trace)
  - Chain badge (e.g. Base Sepolia)
  - Status and risk level badges
- **Overview Cards** (4 cards at top):
  - Audit Readiness Score (with progress bar — color-coded by 80/60 thresholds)
  - Data Source (Explorer API / Mock Fallback / Manual Input / Unknown)
  - Evidence Status (Complete / X gaps found / Not checked)
  - Receipt Status (Generated / Missing)
- **Copy actions** at top: Copy Public Link, Copy Markdown, Copy Receipt Hash — all with check-icon feedback
- **12 Report Sections** in canonical order:
  1. Executive Summary
  2. Project Context
  3. Transaction Context
  4. Execution Timeline
  5. MCP / Tool Call Evidence
  6. AI Audit Report
  7. Evidence Gaps
  8. Risk Flags
  9. Suggested Improvements
  10. Task Receipt
  11. Markdown Export
  12. Footer
- **Graceful empty states** for every section when data is missing
- **Address truncation** for transaction hashes and wallet addresses
- **Mobile responsive** layout

### Demo Report Shortcut

- **"Generate Demo Report" button** on landing page, dashboard, and dashboard empty state
- **One click** automatically creates demo project, run, steps, receipt, AI audit report, and redirects to public report
- **Idempotent**: reuses existing demo project/run instead of creating duplicates
- **Persistent**: demo report survives page refreshes (localStorage)

### Extended `ReceiptAiSummary` type

Backward-compatible additions:
- `executive_summary?: string`
- `missing_evidence?: string[]`
- `risk_flags?: { level: "low" | "medium" | "high"; item: string }[]`
- `suggested_improvements?: string[]`
- `audit_readiness_score?: number`

## Day 7 — Completed (Trust & API Readiness Polish)

The Public Proof-of-Execution Report now makes the difference between Demo Mode and Live Mode obvious to external readers.

- **Data Source & Trust Level card** on `/trace/[publicId]`:
  - Transaction Data Source: Mock Fallback / Explorer API / Manual Input / Unknown
  - AI Report Source: Mock AI Report / Generated by AI Provider / Not generated
  - Verification Level: Demo Mode / Basic Verified / Explorer Verified
  - Receipt Source: Generated by AgentTrace / Missing
  - Report Mode: Demo Mode / Live Mode / Mixed Mode
- **Mode notices**:
  - Mock Transaction Data notice
  - Mock AI Audit Report notice
  - Demo Mode notice (unified when both are mock)
- **How to Read This Report** — 5-item explainer for external readers
- **Alpha Notice** — transparent statement about current support vs. planned features
- **API Readiness card** — lists env vars with what each enables
- **Refined Overview Cards** — replaced "Evidence Status" and "Receipt Status" with "AI Source" and "Verification" cards
- **`src/lib/trust-level.ts`** — pure function `deriveTrustLevel(run, receipt, txContext)` that drives trust labels
- **Landing page**:
  - Hint under hero buttons about Demo Mode vs Live Mode
  - Three-card section highlighting mock fallback, API-ready architecture, and transparent labeling
- **Dashboard**: banner reminding users about Demo Mode

## Day 8 — Completed (Provider-Agnostic AI Integration)

Refactored AI integration from provider-specific to a pluggable, provider-agnostic architecture. Replaced all Z.ai-specific product messaging with generic AI provider messaging.

### AI Provider Architecture

- **New provider layer** at `src/lib/ai/`:
  - `types.ts` — unified `AIProvider` interface, `AIAuditReportInput`, `AIAuditReport` types
  - `providers/index.ts` — unified entry point `generateAIAuditReport()` that routes based on `AI_PROVIDER` env var
  - `providers/mock.ts` — deterministic mock provider (no API calls)
  - `providers/claude-compatible.ts` — third-party Claude-compatible API provider using OpenAI-compatible format
- **Provider routing**:
  - `AI_PROVIDER=mock` (default) → uses mock provider
  - `AI_PROVIDER=claude_compatible` → uses Claude-compatible provider
  - Automatic fallback to mock if API key missing or call fails
- **Claude-compatible provider**:
  - Reads `CLAUDE_COMPATIBLE_API_KEY`, `CLAUDE_COMPATIBLE_API_BASE`, `CLAUDE_COMPATIBLE_MODEL`
  - Uses OpenAI-compatible chat completions format (most third-party Claude APIs use this)
  - Safe URL joining to avoid duplicate `/v1` or slashes
  - Graceful error handling with mock fallback
  - JSON extraction from response with fallback

### Environment Variables

- **Updated `.env.example`**:
  - Removed old `AI_API_KEY`, `AI_MODEL`
  - Added `AI_PROVIDER`, `CLAUDE_COMPATIBLE_API_KEY`, `CLAUDE_COMPATIBLE_API_BASE`, `CLAUDE_COMPATIBLE_MODEL`
  - All AI config is server-only (never exposed to browser)

### Product Messaging Refactor

- **Removed all Z.ai references** from:
  - Landing page (`src/app/page.tsx`)
  - Dashboard (`src/app/dashboard/dashboard-client.tsx`)
  - Public report page (`src/app/trace/[publicId]/public-trace-client.tsx`)
  - Trust level logic (`src/lib/trust-level.ts`)
  - README.md
  - BUILD_LOG.md (this file)
- **New messaging**:
  - "AI Provider" instead of "Z.ai"
  - "Generated by Claude-compatible API" badge when source is `claude_compatible`
  - "Generated by AI Provider" badge when source is `ai`
  - "Configure an AI provider" in help text
  - "Pluggable AI provider" in feature descriptions

### README Updates

- **New "AI Provider Configuration" section** explaining pluggable providers
- Updated API Configuration table with new env vars
- Removed Z.ai-specific setup instructions
- Added Claude-compatible API provider examples

### Type System Updates

- **`AIReportSource` type** now includes:
  - `"Generated by AI Provider"`
  - `"Generated by Claude-compatible API"`
  - `"Mock AI Report"`
  - `"Not generated"`
- **Trust level computation** updated to recognize `claude_compatible` and `anthropic` sources as live
- **Public report badges** updated to show provider-agnostic labels

### Safety & Best Practices

- API keys never exposed to frontend
- All AI calls are server-side only
- Graceful degradation to mock on any failure
- Consistent audit report structure across all providers
- Clear labeling of data sources in UI

### Notes

- Historical Z.ai references in old BUILD_LOG day entries preserved for historical record
- No breaking changes to existing runs or receipts
- Mock provider remains fully functional as default
- Future providers (Anthropic direct, OpenAI, etc.) can be added by implementing the `AIProvider` interface

## Day 9 — README Product Documentation Rewrite

- Rewrote README from development log style into product documentation
- Clarified AgentTrace positioning as a Proof-of-Execution platform for Web3 AI agents
- Added Problem, Solution, Key Features, Demo Flow, Tech Stack, Configuration, Limitations and Roadmap sections
- Removed Z.ai-specific messaging from README
- Added AI provider and explorer API configuration guidance
- Added submission link placeholders for hackathon submission
- README now serves as a product spec for hackathon judges, builders, and DevRel teams instead of a learning notebook
