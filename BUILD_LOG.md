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

## Product Direction

AgentTrace targets Web3 AI Agent builders who need an honest record of what their Agents actually did. A single Agent run can fan out into multiple LLM calls, tool calls, off-chain payments and on-chain transactions; today none of that is visible to the end user or auditable after the fact.

The product produces two things from each Agent run:

1. **A structured execution trace** — eight well-defined step types, replayable in order, with timestamps, inputs and outputs.
2. **A portable Task Receipt** — a sharable URL (and exportable JSON) that proves what was intended, signed and landed on-chain.

Day 1 is intentionally just the visual shell and mock data. The structure of `MockTraceTimeline` already encodes the eight-step model that future days will build the data layer around.

## Next Step

- **Day 2 plan**:
  - Define the trace and step types in `src/lib/types.ts`.
  - Move the hard-coded steps in `MockTraceTimeline` into a `src/lib/mock-traces.ts` module.
  - Add `/traces/[id]` route for a single trace's detail view.
  - Add a "New trace" button on the dashboard that pushes a synthetic trace into client state.
- Still **out of scope** for Day 2: Supabase, real auth, real AI/chain calls, secrets.
