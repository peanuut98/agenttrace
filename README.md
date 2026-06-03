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
- `/auth/callback` route handler for email-confirmation links — exchanges the `code` param for a session and redirects on.
- `projects` table in Postgres with full Row Level Security.

### Day 2.5 — Dev Mode + Agent Run flow

The Supabase email-confirmation flow is still being sorted out. To unblock product work, this build adds a Dev Mode that bypasses auth entirely and persists everything to `localStorage` instead.

- New env flag `NEXT_PUBLIC_DEV_MODE`. When `true`:
  - Middleware no longer protects `/dashboard`, `/projects/*`, or `/runs/*`.
  - `/login` redirects straight to `/dashboard`.
  - The navbar shows a `Dev Mode` badge instead of the auth CTA.
  - All reads/writes go through `lib/storage.ts`, which uses `localStorage` keyed by `agenttrace.projects` / `agenttrace.runs` / `agenttrace.run_steps`.
  - The current user is the constant `dev-user`.
- Real Project Management:
  - `/dashboard` lists the current user's projects, with empty state and create CTA.
  - `/projects/new` creates projects (name required; description / GitHub / demo / wallet / chain optional).
  - `/projects/[id]` shows project detail and that project's runs.
- Real Agent Run flow:
  - `/projects/[id]/runs/new` creates a run with all 8 canonical steps in one form (User Intent → Agent Plan → Tool Calls → Payment Request → Wallet Approval → On-chain Transaction → Verification → Final Result). Each step has its own status (`success / warning / failed / skipped`) and content.
  - `/runs/[id]` shows the run with a real `TraceTimeline` driven by the captured steps, plus a link back to the parent project.
- New components: `ProjectCard`, `RunCard`, `TraceTimeline`, `TraceStep`, `EmptyState`, `StatusBadge`, `RiskBadge`.
- Types: `types/project.ts`, `types/run.ts` (with `STEP_TEMPLATES`, `RUN_STATUS_OPTIONS`, `RISK_LEVEL_OPTIONS`, `STEP_STATUS_OPTIONS`).

#### Switching Dev Mode on

In `.env.local`:

```env
NEXT_PUBLIC_DEV_MODE=true
```

Then restart `npm run dev`. The Supabase keys can stay blank in Dev Mode — they aren't read.

> **Important:** Dev Mode is for local development only. Set `NEXT_PUBLIC_DEV_MODE=false` (or remove the line) before shipping to production. With it on, anyone hitting `/dashboard` is treated as the same `dev-user` and Supabase RLS is bypassed entirely.

### Day 3 — Task Receipt + Markdown Export

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

### Day 4 — AI Summary, MCP-aware UI, Demo data

A receipt is now also explainable. Every run can produce a three-section AI summary (Run Summary / Technical Flow / Audit Notes) directly from the receipt JSON.

- **Server-only AI route** at `src/app/api/ai-summary/route.ts`. The `AI_API_KEY` is read on the server only and never reaches the browser.
- **`src/lib/ai-summary.ts`** with two paths:
  - **AI path**: when `AI_API_KEY` is set, calls the Anthropic Messages API with a strict-JSON system prompt. Default model is `claude-haiku-4-5-20251001`; override with `AI_MODEL`.
  - **Mock path**: when the key is missing _or_ the upstream call throws, builds a deterministic summary from the receipt JSON (intent + tool calls + payment / wallet / on-chain / verification + status / risk). The UI gets a uniform `ReceiptAiSummary` either way and shows a `Mock summary` badge plus a small disclaimer when the mock path is taken.
- **`Receipt` gains `ai_summary`** (`run_summary`, `technical_flow`, `audit_notes`, `source: "ai" | "mock"`, `generated_at`). Regenerating the underlying receipt invalidates the prior summary so it always reflects the current snapshot.
- **`SummaryPanel`** mounts on `/runs/[id]` below the `ReceiptPanel`:
  - Tells the user to generate a receipt first when there isn't one.
  - "Generate AI summary" / "Regenerate AI summary" with loading state and toast feedback.
  - Renders the three sections with icons and a source badge (AI vs Mock).
- **MCP-aware Trace Timeline**: the `tool_calls` step now renders a structured key/value card whenever `metadata` carries `mcp_server`, `tool_name`, `tool_input_summary`, `tool_output_summary`, or `latency_ms`. Steps without metadata fall back to the existing content rendering.
- **Demo project loader**: the empty-state on `/dashboard` gains a `Load demo project` button. It writes a fully-populated demo project + run (`Wallet Risk Analysis with Paid Data API` on Base Sepolia, with MCP metadata on the tool-calls step and a transaction hash on the on-chain step) and routes to the run detail page.
- **`NewRunStepInput` and the run insert path** now persist optional `metadata`, so any future creation flow can attach MCP / tx-hash metadata without another migration.

#### Configuring the AI summary

In `.env.local`:

```env
AI_API_KEY=sk-ant-...        # optional — leave blank to use mock summaries
AI_MODEL=claude-haiku-4-5-20251001   # optional override
```

Without `AI_API_KEY`, the API route still returns a valid summary; the panel just labels it `Mock summary` and shows a one-line disclaimer.

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

- **Day 5** — Wire `runs` / `run_steps` / `receipts` tables into Supabase + RLS so flipping `NEXT_PUBLIC_DEV_MODE=false` keeps the same flows working. Finish the email-confirmation callback so signed-in flows round-trip cleanly.
- **Day 6** — Public share page for receipts (read-only by hash).
- **Day 7+** — Real chain integrations, signature verification, signed receipts.

## Notes

- No real `.env` files are committed; only `.env.example`.
- `.gitignore` covers `node_modules`, `.next`, `.env*` (except `.env.example`), `.DS_Store`.
- All Supabase access in this app uses the **anon key**. Authorization is enforced by RLS, not by the client.
