/**
 * One-click Demo Report generator.
 *
 * Idempotent — running this multiple times reuses the existing demo project
 * and run instead of creating duplicates. Used by the "Generate Demo Report"
 * shortcut on landing page and dashboard so hackathon judges can see a full
 * Proof-of-Execution Report without filling out forms.
 */

import {
  createProjectBrowser,
  createRunWithStepsBrowser,
  saveReceiptBrowser,
  updateReceiptSummaryBrowser,
  updateRunPublicStatusBrowser,
  listProjectsBrowser,
  listRunsForProjectBrowser,
  getReceiptForRunBrowser,
} from "@/lib/storage";
import { buildReceipt } from "@/lib/receipt";
import { generatePublicId } from "@/lib/public-id";
import type { Project } from "@/types/project";
import type {
  NewRunStepInput,
  Run,
  RunStep,
  StepType,
  StepStatus,
} from "@/types/run";
import type { ReceiptAiSummary, RiskFlag } from "@/types/receipt";

const DEMO_PROJECT_NAME = "Agent Payment Demo";
const DEMO_RUN_TITLE = "Wallet Risk Analysis with Transaction Evidence";

const DEMO_TX_HASH = "0xabc123demo";
const DEMO_CHAIN = "Base Sepolia";

const DEMO_TRANSACTION_CONTEXT = {
  chain: DEMO_CHAIN,
  tx_hash: DEMO_TX_HASH,
  status: "success" as const,
  from: "0x1234567890abcdef1234567890abcdef12345678",
  to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  value: "0.01 ETH",
  gas_used: "21000",
  block_number: "123456",
  timestamp: new Date().toISOString(),
  method: "transfer",
  explorer_url: `https://sepolia.basescan.org/tx/${DEMO_TX_HASH}`,
  is_mock: true,
};

const DEMO_STEPS: NewRunStepInput[] = [
  {
    step_type: "user_intent",
    title: "User Intent",
    status: "success",
    content:
      "The user asked the agent to analyze a wallet-related transaction and produce a reviewable proof-of-execution report.",
  },
  {
    step_type: "agent_plan",
    title: "Agent Plan",
    status: "success",
    content:
      "The agent planned to inspect the transaction context, identify available evidence, check whether any MCP tool call or payment step was recorded, and generate an audit-ready report.",
  },
  {
    step_type: "tool_calls",
    title: "MCP / Tool Calls",
    status: "success",
    content:
      "The run includes a simulated MCP-aware analysis step. No raw MCP output was attached in this alpha demo.",
    metadata: {
      mcp_server: "wallet-risk-mcp",
      tool_name: "analyze_wallet_transaction",
      tool_input_summary: "transaction hash and chain context",
      tool_output_summary: "wallet risk indicators and transaction evidence summary",
      latency_ms: 1200,
    },
  },
  {
    step_type: "payment_request",
    title: "Payment Request",
    status: "skipped",
    content: "No separate payment request was recorded in this demo run.",
  },
  {
    step_type: "wallet_approval",
    title: "Wallet Approval",
    status: "warning",
    content:
      "The transaction context indicates an on-chain transaction was submitted, but no separate wallet approval record was attached.",
  },
  {
    step_type: "onchain_transaction",
    title: "On-chain Transaction",
    status: "success",
    content:
      "The run includes a Base Sepolia transaction context with transaction hash, sender, receiver, value, gas usage, and explorer link.",
    metadata: {
      transaction_hash: DEMO_TX_HASH,
    },
  },
  {
    step_type: "verification",
    title: "Verification",
    status: "warning",
    content:
      "The transaction context and generated receipt were used as basic verification evidence. Since this is a demo, the data source is marked as Mock Fallback.",
  },
  {
    step_type: "final_result",
    title: "Final Result",
    status: "success",
    content:
      "AgentTrace generated a proof-of-execution report with transaction context, execution timeline, AI audit notes, evidence gaps, risk flags, and receipt hash.",
  },
];

const DEMO_AI_SUMMARY: Omit<ReceiptAiSummary, "generated_at" | "source"> = {
  executive_summary:
    "This demo report shows how AgentTrace converts a Web3 agent workflow and transaction context into a shareable proof-of-execution report.",
  run_summary:
    "This demo report shows how AgentTrace converts a Web3 agent workflow and transaction context into a shareable proof-of-execution report.",
  technical_flow:
    "The workflow starts from a user intent, proceeds through an MCP-aware analysis step, records transaction context, identifies missing evidence, and produces an audit-ready report.",
  audit_notes:
    "This report is suitable for demo and review purposes. It clearly marks mock transaction data and highlights missing evidence such as raw MCP output and wallet approval records.",
  missing_evidence: [
    "Raw MCP tool output was not attached.",
    "Wallet approval record was not attached.",
    "Transaction data is marked as Mock Fallback rather than Explorer API.",
  ],
  risk_flags: [
    {
      level: "medium",
      item: "Transaction context is available, but some supporting evidence is missing.",
    },
    {
      level: "low",
      item: "The report clearly labels mock data and does not claim full on-chain verification.",
    },
  ] satisfies RiskFlag[],
  suggested_improvements: [
    "Attach raw MCP tool input and output logs.",
    "Connect a real explorer API for transaction verification.",
    "Include wallet approval records or signed messages.",
    "Store receipt hash on-chain in a future version.",
  ],
  audit_readiness_score: 72,
};

export type DemoReportResult = {
  project: Project;
  run: Run;
  publicId: string;
  publicUrl: string;
  alreadyExisted: boolean;
};

/**
 * Create or reuse the canonical demo report.
 *
 * Idempotency rule:
 *   1. If a project named DEMO_PROJECT_NAME exists, reuse it.
 *   2. If that project already has a run titled DEMO_RUN_TITLE, reuse it
 *      (and just ensure it's public with a public_id). Don't recreate steps.
 *   3. Otherwise build the full demo from scratch.
 */
export async function generateDemoReport(): Promise<DemoReportResult> {
  // Step 1: Find or create the demo project
  const projects = await listProjectsBrowser();
  let project = projects.find((p) => p.name === DEMO_PROJECT_NAME) ?? null;
  let alreadyExisted = false;

  if (!project) {
    project = await createProjectBrowser({
      name: DEMO_PROJECT_NAME,
      description:
        "A demo project showing how AgentTrace turns a Web3 AI Agent workflow into a shareable proof-of-execution report.",
      chain: DEMO_CHAIN,
      wallet_address: "0x1234567890abcdef1234567890abcdef12345678",
    });
  }

  // Step 2: Find or create the demo run
  const existingRuns = await listRunsForProjectBrowser(project.id);
  let run =
    existingRuns.find((r) => r.title === DEMO_RUN_TITLE) ?? null;

  if (run) {
    alreadyExisted = true;
  } else {
    run = await createRunWithStepsBrowser({
      project_id: project.id,
      title: DEMO_RUN_TITLE,
      agent_name: "Transaction Analysis Agent",
      status: "success",
      risk_level: "medium",
      steps: DEMO_STEPS,
      metadata: {
        generated_from_transaction: true,
        transaction_hash: DEMO_TX_HASH,
        transaction_chain: DEMO_CHAIN,
        analysis_source: "mock",
      },
    });
  }

  // Step 3: Ensure receipt exists with transaction context
  let receipt = await getReceiptForRunBrowser(run.id);
  if (!receipt) {
    const steps: RunStep[] = DEMO_STEPS.map((step, idx) => ({
      id: `demo-step-${idx}`,
      run_id: run!.id,
      step_type: step.step_type as StepType,
      title: step.title,
      content: step.content,
      status: step.status as StepStatus,
      order_index: idx,
      created_at: new Date().toISOString(),
      metadata: step.metadata ?? null,
    }));

    const built = await buildReceipt(run, project, steps);

    // Augment metadata with transaction context for the public report
    const receiptJsonWithTx = {
      ...built.receipt_json,
      metadata: {
        ...built.receipt_json.metadata,
        transaction_context: {
          ...DEMO_TRANSACTION_CONTEXT,
          transaction_hash: DEMO_TX_HASH,
          analysis_source: "mock",
        },
      },
    };

    receipt = await saveReceiptBrowser({
      run_id: run.id,
      project_id: project.id,
      receipt_json: receiptJsonWithTx,
      receipt_hash: built.receipt_hash,
      markdown_export: built.markdown_export,
    });
  }

  // Step 4: Ensure AI audit summary is attached
  if (!receipt.ai_summary) {
    let aiSummary: ReceiptAiSummary;

    // Try the real AI provider first; fall back to demo mock if it fails.
    try {
      const res = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt_json: receipt.receipt_json }),
      });

      if (!res.ok) {
        throw new Error(`AI summary request failed: ${res.status}`);
      }

      aiSummary = (await res.json()) as ReceiptAiSummary;
    } catch (err) {
      console.warn("[DemoReport] AI provider call failed, using demo fallback:", err);
      aiSummary = {
        ...DEMO_AI_SUMMARY,
        source: "mock",
        generated_at: new Date().toISOString(),
      };
    }

    await updateReceiptSummaryBrowser(run.id, aiSummary);
  }

  // Step 5: Ensure run is public with a public_id
  let publicId = run.public_id ?? null;
  if (!run.is_public || !publicId) {
    publicId = generatePublicId();
    run = await updateRunPublicStatusBrowser(run.id, true, publicId);
  }

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  return {
    project,
    run,
    publicId: publicId!,
    publicUrl: `${origin}/trace/${publicId}`,
    alreadyExisted,
  };
}
