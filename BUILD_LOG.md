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

## Day 10 — Z.ai GLM-5.1 as Primary AI Provider

Restored Z.ai GLM-5.1 as the recommended primary AI provider for AI Audit Reports, while keeping the pluggable provider architecture so claude_compatible and mock continue to work as fallbacks.

### New Z.ai Provider

- **`src/lib/ai/providers/zai.ts`** — `ZaiProvider` calls Z.ai's OpenAI-compatible chat completions endpoint:
  - Reads `ZAI_API_KEY`, `ZAI_MODEL` (default `glm-5.1`), `ZAI_API_BASE` (default `https://api.z.ai/api/paas/v4`)
  - POSTs to `{ZAI_API_BASE}/chat/completions` with `Authorization: Bearer …`
  - Tolerates ```json fenced output, falls back to mock on missing key, HTTP error, network error, or JSON parse failure
  - Never logs API key plaintext
  - Returns `source: "z_ai"`, `model: ZAI_MODEL`, `is_mock: false` on success; on fallback returns mock with `fallback_reason` populated

### Provider Routing

- **`src/lib/ai/providers/index.ts`** — default `AI_PROVIDER` is now `z_ai`. Routes:
  - `z_ai` / `zai` / `z.ai` → `ZaiProvider`
  - `claude_compatible` → `ClaudeCompatibleProvider`
  - `mock` (or anything else) → `MockAIProvider`

### Type System

- **`src/lib/ai/types.ts`** — `AIAuditReport.source` extended to `'z_ai' | 'claude_compatible' | 'anthropic' | 'mock'`. Added `fallback_reason?: string` for transparent fallback explanations.
- **`src/types/receipt.ts`** — `ReceiptAiSummary.source` extended to `'mock' | 'ai' | 'z_ai' | 'claude_compatible'`. Added `model?: string` and `fallback_reason?: string`.
- **`src/lib/trust-level.ts`** — `AIReportSource` adds `"Generated by GLM-5.1"`. `computeAIReportSource` returns the GLM-5.1 label when `source === "z_ai"` and the model name contains `glm`.

### Claude-compatible Provider Fallback Reasons

- **`src/lib/ai/providers/claude-compatible.ts`** — refactored to populate `fallback_reason` on every fallback path (missing config, HTTP error, fetch failure, non-JSON response, missing JSON object). Brings parity with the new ZaiProvider.

### Audit Report API Route

- **`src/app/api/ai/audit-report/route.ts`** — new POST endpoint. Validates the input shape and calls `generateAIAuditReport()`. Returns the structured `AIAuditReport` directly, including `source`, `model`, `is_mock`, and `fallback_reason`.

### Public Report UI

- **`src/app/trace/[publicId]/public-trace-client.tsx`**:
  - Header badge shows `Generated by GLM-5.1` when `aiSummary.source === "z_ai"`, `Generated by Claude-compatible API` when `claude_compatible`, `Generated by AI Provider` otherwise (live), or `Mock AI Report` (mock).
  - AI Audit Report sub-card shows the same badge plus a `model: …` chip and an amber `Fallback reason: …` callout when `fallback_reason` is present.
  - Data Source & Trust Level card recognizes `Generated by GLM-5.1` as a live source.
  - Mock AI Audit Report notice now mentions Z.ai GLM-5.1 as the recommended primary provider.
  - API Readiness card lists `ZAI_API_KEY`, `ZAI_MODEL`, `ZAI_API_BASE` first, with claude_compatible as an optional fallback.

### Environment Variables

- **`.env.example`** — `AI_PROVIDER=z_ai` is the default. Adds `ZAI_API_KEY`, `ZAI_MODEL=glm-5.1`, `ZAI_API_BASE=https://api.z.ai/api/paas/v4`. Keeps `CLAUDE_COMPATIBLE_*` as optional fallback.

### Debug Endpoints

- **`src/app/api/debug/env/route.ts`** — surfaces `hasZaiKey`, `zaiBase`, `zaiModel` flags alongside the existing claude_compatible flags. Still dev-mode only, never returns plaintext keys.
- **`src/app/api/debug/ai-test/route.ts`** — picks the right provider to ping based on `AI_PROVIDER`. Sends a minimal "reply with pong" prompt and returns the upstream HTTP status / response preview / extracted content. Still dev-mode only.

### Safety

- API keys remain server-only (no `NEXT_PUBLIC_*` exposure)
- No API keys, `.env.local`, or secrets committed
- All fallback paths set `fallback_reason` so the UI can transparently explain why a report is mock

## Day 11 — Structured AI Provider Diagnostics

When the audit report kept falling back to mock with no actionable information, we built a closed set of fallback codes and surfaced them everywhere the report is rendered.

### Closed `FallbackReasonCode` set

`src/lib/ai/types.ts` adds `FallbackReasonCode`:

- `missing_api_key`
- `missing_base_url`
- `missing_model`
- `unauthorized`        (HTTP 401/403)
- `insufficient_balance` (HTTP 402 / "insufficient balance" / quota exhausted)
- `model_not_found`    (HTTP 404 / "model_not_found" / "no available channel")
- `invalid_request`    (HTTP 400/422)
- `invalid_response_format` (no `choices[0].message.content`)
- `json_parse_error`   (model output not parseable as JSON)
- `network_error`      (fetch threw)
- `unknown_error`      (everything else)

`AIAuditReport` adds `fallback_reason`, `fallback_detail`, `attempted_provider`, `attempted_model`. `ReceiptAiSummary` mirrors those fields.

### Provider-side mapping

- New `src/lib/ai/providers/_shared.ts`: `buildChatCompletionsUrl`, `extractMessageContent`, `extractJSON` (handles ```json fences), `classifyHttpError`, plus type-safe field extractors.
- `ZaiProvider` and `ClaudeCompatibleProvider` both:
  - Validate config (key/base/model) before any network call and return structured codes for missing config.
  - Wrap every fetch in try/catch and map `network_error`.
  - Map non-2xx responses through `classifyHttpError` (status + body string-matching).
  - Detect `invalid_response_format` when the body has no `choices[0].message.content`.
  - Detect `json_parse_error` when the model emitted prose / non-JSON.
  - Always set `attempted_provider` and `attempted_model` on the returned report so the UI can show what was tried.

### Server logs

`src/lib/ai/providers/index.ts` now logs:

- `[ai] selected provider: …`
- `[ai] attempting provider: …`
- `[ai] fallback to mock: { attempted_provider, attempted_model, fallback_reason, fallback_detail }`
- `[ai] provider call ok: { source, model }`

Each provider also logs detailed per-failure context (`[zai] http_error`, `[zai] json_parse_error`, etc.) — never the API key, only URL + model + status + body preview.

### UI

- `src/app/trace/[publicId]/public-trace-client.tsx` — new `FallbackDiagnostic` component on the AI Audit Report card. Renders:
  - `Fallback reason: <code>` chip
  - `Attempted provider: <code>`
  - `Attempted model: <code>`
  - Action-oriented guidance (`FALLBACK_REASON_GUIDANCE` map)
  - Raw `fallback_detail` in monospace
- `src/components/summary-panel.tsx` — same diagnostic block on the Run Detail summary panel, plus GLM-5.1 / Claude-compatible badges and a `model: …` chip.

### Debug endpoints

- `GET /api/debug/env` — returns `AI_PROVIDER`, `hasZaiKey`, `zaiBase`, `zaiModel`, the computed `expectedZaiUrl`, plus claude_compatible and explorer flags. Dev-mode only. Never returns plaintext keys.
- `GET /api/debug/test-zai` — sends a minimal "Return only this JSON" prompt to Z.ai and reports the result of each step (URL, status, elapsed time, parsed JSON or `errorPreview`). Dev-mode only. Never returns or logs plaintext keys.

### Safety

- All API keys remain server-only.
- No API keys, `.env.local`, or secrets committed.
- Debug endpoints return 404 in production.
- `fallback_reason` is a closed enum the UI maps to actionable guidance, so users never see opaque error messages.

## Day 12 — On-chain Proof Registry

Added a minimal Solidity contract and a manually-confirmed wallet flow that anchors AgentTrace's off-chain receipt hashes to a public on-chain event log on Base Sepolia. The contract is **event-only**: no funds, no admin, no upgrade path.

### Contract

- `contracts/AgentTraceProofRegistry.sol`
  - Solidity 0.8.20, MIT-licensed
  - Single function `registerProof(bytes32 receiptHash, string publicReportUrl)` that emits `ProofRegistered(receiptHash, publicReportUrl, submitter, timestamp)`
  - No state, no payable, no owner, no upgrade path
- `docs/CONTRACT_DEPLOYMENT.md` — Remix → Base Sepolia deployment walkthrough with explicit testnet-only safety notes and placeholder fields for the deployed address / tx
- `docs/WEB3_PROOF.md` — scope, safety boundaries, and on-chain verification instructions

### Front-end

- `src/lib/web3/keccak256.ts` — pure-JS Keccak-256 implementation with a self-test at module load. Used to derive the `registerProof(bytes32,string)` selector at runtime (verified `0x2a6fc70a` against `transfer(address,uint256)=0xa9059cbb`). Avoids pulling in viem / ethers / js-sha3 just to hash one signature string.
- `src/lib/web3/proof-registry.ts` — manual ABI calldata encoder for `registerProof(bytes32, string)`, plus `eth_requestAccounts` / `wallet_switchEthereumChain` / `wallet_addEthereumChain` flow targeting Base Sepolia (chainId 84532, hex `0x14a34`)
- `src/components/register-proof-button.tsx` — dev-mode-only UI button. Visible only when `NEXT_PUBLIC_DEV_MODE=true`, `NEXT_PUBLIC_PROOF_REGISTRY_ADDRESS` is set, and `window.ethereum` is detected. Shows the safety notice (no private keys held, manual confirmation required, contract holds no funds, testnet only) and an in-place `RegistrationSummary` after a successful submission.

### Receipt model + storage

- `src/types/receipt.ts` — new `ProofRegistration` type and optional `proof_registration` field on `Receipt`
- `src/lib/storage.ts` — new `saveProofRegistrationBrowser(runId, registration)` helper, mirrors the dev-mode (localStorage) and Supabase paths used by the AI summary helper

### Public Report

- `src/app/trace/[publicId]/public-trace-client.tsx` — new section "On-chain Proof Registration" rendered after the Markdown export. Section is empty until a receipt with a hash exists, at which point it renders the dev-mode `RegisterProofButton`. After the user manually confirms the wallet transaction, the section flips to a registration summary card with contract address, tx hash, network, submitter, status, and a BaseScan link.

### Environment variables

- `.env.example` — added `NEXT_PUBLIC_PROOF_REGISTRY_ADDRESS=` placeholder. Public contract addresses are safe to ship as `NEXT_PUBLIC_*`; private keys / paid RPC keys are not, and the comment makes that explicit.

### README

- New "On-chain Proof Registration" section in the README with the explicit non-goals (does not auto-scrape, does not auto-analyse, does not sign on user's behalf, does not move funds) and pointers to the deployment doc and `WEB3_PROOF.md`.

### Safety boundaries (enforced at code + UI level)

- AgentTrace never holds, sees, or transmits private keys.
- Every on-chain registration requires manual wallet confirmation.
- The contract has no payable function and cannot receive ETH or tokens.
- The contract has no admin and no upgrade path.
- The button is dev-mode-only and requires both a configured contract address and a detected browser wallet.
- Testnet only (Base Sepolia, chainId 84532). Mainnet deployment requires explicit access-control review.
- The function selector is computed at module load with a tested keccak256 implementation rather than hardcoded, so a typo can never silently send a wrong call to the wallet.
