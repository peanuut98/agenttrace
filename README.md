# AgentTrace

AgentTrace turns Web3 AI Agent runs into shareable Proof-of-Execution reports.

AgentTrace helps Web3 AI Agent builders reconstruct agent workflows, attach transaction context, generate task receipts, and create AI-assisted audit reports that can be shared with hackathon judges, DevRel teams, teammates, or users.

## Problem

Web3 AI Agent workflows are becoming harder to audit because evidence is scattered across:

- model outputs
- tool calls
- wallet approvals
- block explorers
- transaction hashes
- manual notes

A single Agent Run may include off-chain reasoning, MCP-aware tool calls, payment requests, wallet approval, on-chain transaction context, verification steps, and final outputs. Without a unified report, it is difficult to understand what happened and what evidence exists.

## Solution

AgentTrace provides a lightweight Proof-of-Execution layer for Web3 AI agents.

It turns an Agent Run or transaction hash into a structured report that explains:

- what the user asked
- what the agent planned
- what tools or MCP-aware steps were involved
- what transaction context was available
- what evidence exists
- what evidence is missing
- what risks were identified
- what receipt was generated

## Key Features

### Transaction-to-Trace

Users can create a report from a transaction hash and reconstruct a Web3 Agent Run around it.

### Execution Timeline

AgentTrace organizes the run into a step-by-step timeline:

- User Intent
- Agent Plan
- MCP / Tool Calls
- Payment Request
- Wallet Approval
- On-chain Transaction
- Verification
- Final Result

### AI Audit Report

A pluggable AI provider can generate:

- Executive Summary
- Technical Flow
- Audit Notes
- Missing Evidence
- Risk Flags
- Suggested Improvements
- Audit Readiness Score

### Public Proof-of-Execution Report

Each Agent Run can be shared through a public report page.

### Task Receipt and Receipt Hash

AgentTrace generates a structured receipt and stable receipt hash for reference.

### Data Source Transparency

Reports clearly label whether data comes from:

- Mock Fallback
- Explorer API
- Manual Input
- AI Provider

### Mock Fallback and Live API Ready

AgentTrace works in Demo Mode without API keys, while also supporting live API configuration.

### On-chain Proof Registration (Base Sepolia)

A minimal `AgentTraceProofRegistry` contract can anchor a receipt hash on-chain via a single, manually-confirmed transaction. The contract holds no funds and only emits a `ProofRegistered` event. Transaction analysis remains the responsibility of Transaction-to-Trace; this anchor only adds an independently-verifiable on-chain reference for the off-chain report. See [`docs/WEB3_PROOF.md`](./docs/WEB3_PROOF.md) and [`docs/CONTRACT_DEPLOYMENT.md`](./docs/CONTRACT_DEPLOYMENT.md).

## Demo Flow

1. Open AgentTrace.
2. Click Generate Demo Report.
3. Review the public Proof-of-Execution Report.
4. Inspect Transaction Context.
5. Review the Execution Timeline.
6. Check the AI Audit Report.
7. Review Evidence Gaps, Risk Flags, and Suggested Improvements.
8. Copy or share the public report link.

Demo: replace with deployed URL.

## How It Works

```
User / Builder
   ↓
Create Agent Run or import transaction hash
   ↓
AgentTrace builds transaction context and execution timeline
   ↓
AI provider generates audit report
   ↓
AgentTrace generates task receipt and receipt hash
   ↓
Public Proof-of-Execution Report is shared
```

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (auth + Postgres, optional)
- localStorage / Dev Mode for demo persistence
- Pluggable AI Provider layer
- Claude-compatible API provider support
- Explorer API-ready transaction context
- Public report pages

## AI Provider Configuration

AgentTrace uses a pluggable AI provider layer for AI Audit Reports.

Current supported modes:

- `mock`: local fallback for no-key demos
- `claude_compatible`: third-party Claude-compatible API provider

Example environment variables:

```env
AI_PROVIDER=claude_compatible
CLAUDE_COMPATIBLE_API_KEY=
CLAUDE_COMPATIBLE_API_BASE=
CLAUDE_COMPATIBLE_MODEL=
```

If no AI provider key is configured, AgentTrace falls back to mock AI audit reports.

API keys are server-only and never exposed to the browser. Do not commit real API keys.

## Explorer API Configuration

Explorer API keys can be used to enable live transaction context.

```env
ETHERSCAN_API_KEY=
BASESCAN_API_KEY=
```

If explorer keys are not configured, AgentTrace uses mock fallback transaction data for demo purposes.

## On-chain Proof Registration

AgentTrace ships a minimal contract, `AgentTraceProofRegistry`, that anchors the off-chain receipt hash to a public on-chain event log. The contract is intentionally narrow:

- It **does not** automatically scrape on-chain transactions. Transaction context is collected by the Transaction-to-Trace flow.
- It **does not** automatically analyse agent runs. AI Audit Reports come from the configured AI provider.
- It **does not** sign anything on the user's behalf. Every registration requires manual wallet confirmation.
- It **does not** hold or transfer funds. There is no admin and no upgrade path.

```env
NEXT_PUBLIC_PROOF_REGISTRY_ADDRESS=
```

After deploying `contracts/AgentTraceProofRegistry.sol` to Base Sepolia (see [`docs/CONTRACT_DEPLOYMENT.md`](./docs/CONTRACT_DEPLOYMENT.md)), set this env var to the deployed contract address. The contract address is public — it is safe to ship as `NEXT_PUBLIC_*`.

In dev mode the Public Report shows a **Register Proof On-chain** button. The user's wallet must manually confirm a `registerProof(bytes32 receiptHash, string publicReportUrl)` call. The resulting transaction hash and BaseScan link are then displayed alongside the receipt.

For full safety boundaries and verification instructions, see [`docs/WEB3_PROOF.md`](./docs/WEB3_PROOF.md).

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open:

```
http://localhost:3000
```

Do not commit `.env.local`.

## Current Alpha Mode

AgentTrace Alpha supports a full demo workflow without requiring API keys. Mock fallback data is clearly labeled in public reports. Live AI audit reports and live transaction context can be enabled by configuring provider and explorer API keys.

## Limitations

- Current Alpha uses Dev Mode / localStorage for demo persistence.
- Mock fallback is used when API keys are not configured.
- MCP tool calls are currently MCP-aware records, not automatic MCP SDK logs.
- Wallet approval records are not automatically captured yet.
- Payment tracing is not fully integrated yet.
- Explorer transaction parsing currently focuses on basic transaction context.
- Production deployment should use a persistent database.

## Roadmap

- Live explorer transaction verification
- More AI provider integrations
- MCP tool call logger
- Wallet approval tracking
- x402 payment trace
- On-chain receipt anchoring
- Team workspace for hackathons and DevRel teams
- Persistent database and production auth

## Why It Matters

AgentTrace is designed for Web3 AI Agent builders, hackathon teams, DevRel programs, and future agent platforms that need to explain, verify, and share what an agent did.

Instead of only showing a transaction hash or a chat transcript, AgentTrace connects agent intent, execution steps, transaction context, audit analysis, and receipt data into one shareable Proof-of-Execution report.

## Submission Links

- Live Demo:
- Public Report Example:
- GitHub Repo:
- Demo Video:
