/**
 * Demo data loader. Used by the empty-state CTA on /dashboard so a new user
 * can see what AgentTrace produces without having to fill out two forms.
 *
 * In Dev Mode this writes to localStorage; in Supabase mode it goes through
 * the same `createProjectBrowser` / `createRunWithStepsBrowser` adapters as
 * the real flows, so RLS still applies.
 */

import {
  createProjectBrowser,
  createRunWithStepsBrowser,
} from "@/lib/storage";
import type { Project } from "@/types/project";
import type { NewRunStepInput, Run } from "@/types/run";

const DEMO_PROJECT = {
  name: "Agent Payment Demo",
  description:
    "A demo showing how AgentTrace records a Web3 AI Agent workflow involving MCP tool calls, payment request, wallet approval, on-chain transaction, verification and final output.",
  chain: "Base Sepolia",
  wallet_address: "0x1234567890abcdef1234567890abcdef12345678",
};

const DEMO_RUN_BASE = {
  title: "Wallet Risk Analysis with Paid Data API",
  agent_name: "Wallet Risk Agent",
  status: "success" as const,
  risk_level: "medium" as const,
};

const DEMO_STEPS: NewRunStepInput[] = [
  {
    step_type: "user_intent",
    title: "User Intent",
    status: "success",
    content:
      "Analyze wallet 0x123 on Base Sepolia and generate a basic risk summary under a 1 USDC budget.",
  },
  {
    step_type: "agent_plan",
    title: "Agent Plan",
    status: "success",
    content:
      "The agent plans to parse the wallet address, call an MCP wallet data tool, request paid risk signals, verify the returned fields, and generate a final report.",
  },
  {
    step_type: "tool_calls",
    title: "MCP / Tool Calls",
    status: "success",
    content:
      "Called wallet-risk-mcp server using analyze_wallet tool. The tool returned wallet activity, token approvals, and suspicious interaction signals.",
    metadata: {
      mcp_server: "wallet-risk-mcp",
      tool_name: "analyze_wallet",
      tool_input_summary: "wallet address and chain",
      tool_output_summary: "risk score, approvals, suspicious interactions",
      latency_ms: 1200,
    },
  },
  {
    step_type: "payment_request",
    title: "Payment Request",
    status: "success",
    content:
      "The agent requested 0.2 USDC to access the Risk Signal API. The payment was within the user-defined budget.",
  },
  {
    step_type: "wallet_approval",
    title: "Wallet Approval",
    status: "success",
    content:
      "The user manually approved the payment request because it involved a paid external service.",
  },
  {
    step_type: "onchain_transaction",
    title: "On-chain Transaction",
    status: "success",
    content:
      "Transaction hash: 0xabc123demo. The transaction was submitted on Base Sepolia.",
    metadata: {
      transaction_hash: "0xabc123demo",
    },
  },
  {
    step_type: "verification",
    title: "Verification",
    status: "success",
    content:
      "The result passed basic verification. Risk score, risk level and supporting evidence were returned.",
  },
  {
    step_type: "final_result",
    title: "Final Result",
    status: "success",
    content:
      "The wallet was classified as medium risk due to recent interactions with unknown contracts and one suspicious approval pattern.",
  },
];

export async function loadDemoProject(): Promise<{
  project: Project;
  run: Run;
}> {
  const project = await createProjectBrowser({
    name: DEMO_PROJECT.name,
    description: DEMO_PROJECT.description,
    chain: DEMO_PROJECT.chain,
    wallet_address: DEMO_PROJECT.wallet_address,
  });

  const run = await createRunWithStepsBrowser({
    project_id: project.id,
    ...DEMO_RUN_BASE,
    steps: DEMO_STEPS,
  });

  return { project, run };
}
