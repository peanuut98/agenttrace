# AgentTrace

> Audit receipts for every Web3 AI Agent task.

AgentTrace is an execution-trace and audit-receipt platform built for Web3 AI Agent builders. It records the full lifecycle of an Agent task — user intent, execution plan, tool calls, payment requests, wallet confirmations, on-chain transactions, result verification and final output — and turns each run into a shareable Task Receipt that users, auditors and counterparties can inspect.

## Product positioning

- **For**: developers building AI Agents that touch wallets, funds or on-chain state.
- **Why**: Web3 Agent runs span LLM calls, tool calls, wallet signatures and on-chain effects. When something goes wrong (or right), there's no clean record of what actually happened.
- **What AgentTrace does**: provides a structured, replayable trace per Agent run and a portable Task Receipt that proves what was attempted, what was signed and what landed on-chain.
- **Day 1 scope**: foundational scaffolding only — UI shell, mock data, no real auth, no AI calls, no chain access.

## Day 1 — completed

- Initialised a Next.js + TypeScript + Tailwind CSS project (App Router, `src/` directory).
- Wired up `shadcn/ui` (Radix-Nova preset, neutral base) and `lucide-react`.
- Built three pages:
  - `/` — landing page with product pitch and a sample trace timeline.
  - `/login` — placeholder sign-in screen (wallet / email buttons disabled, no real auth).
  - `/dashboard` — demo workspace with stats cards and the latest mock trace.
- Built four reusable components:
  - `Navbar` — sticky top navigation.
  - `FeatureCard` — icon + title + description card used on the landing page.
  - `MockTraceTimeline` — vertical timeline that renders the eight Agent-task steps.
  - `StatsCard` — compact label/value/hint card for dashboard metrics.
- Authored `README.md` and `BUILD_LOG.md`.
- Verified `.gitignore` covers `node_modules`, `.next`, `.env`, `.env.local`, `.DS_Store`.
- Added `.env.example` (no real `.env` file is committed).

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- React 19 + TypeScript 5
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com) (Radix-Nova preset)
- [lucide-react](https://lucide.dev) icons
- ESLint 9

## Run locally

Requires Node.js 20.9+.

```bash
git clone https://github.com/peanuut98/agenttrace.git
cd agenttrace
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Useful scripts:

```bash
npm run dev     # start the dev server
npm run build   # production build
npm run start   # run the production build
npm run lint    # run ESLint
```

## Roadmap

- **Day 2** — domain model for traces and steps; client-side mock store; trace detail page.
- **Day 3** — wire up auth (wallet connect or email magic link); per-user trace history.
- **Day 4** — capture-side SDK sketch: how an Agent submits a trace.
- **Day 5** — Task Receipt object: shareable URL, JSON export, hash for verification.
- **Day 6+** — real chain integrations, signature verification, hosted backend.

## Notes

- Day 1 contains no API keys, secrets or `.env` files.
- All trace data on-screen is hard-coded mock data.
