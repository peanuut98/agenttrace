/**
 * Transaction Trace Generator.
 *
 * Alpha version: generates structured timeline steps from transaction context.
 * Falls back to mock generator when AI_API_KEY is not configured.
 */

import "server-only";
import type { TransactionContext } from "@/lib/web3/transaction";
import type { Project } from "@/types/project";
import type { NewRunStepInput, RunStatus, RiskLevel } from "@/types/run";

const DEFAULT_MODEL = "claude-sonnet-4-6-20250402";

const SYSTEM_PROMPT = `You are a transaction analyzer for AgentTrace, a Web3 AI Agent execution trace platform.

Given transaction context from a blockchain explorer, generate a structured timeline with exactly 8 steps representing how this transaction might have been produced by an AI agent workflow.

CRITICAL RULES:
1. Only use information from the transaction_context provided.
2. Do NOT invent contract names, token symbols, ABI methods, or events not in the input.
3. If method is unknown or just a hex signature, write "unknown method" or the signature.
4. For steps without evidence (e.g., no MCP server name, no payment proof), write "Not recorded" or "No evidence provided."
5. Be professional and factual. This is for Proof-of-Execution auditing.
6. Output STRICT JSON matching this schema exactly.

Return JSON:
{
  "run_title": "...",
  "agent_name": "...",
  "status": "success" | "warning" | "failed" | "draft",
  "risk_level": "low" | "medium" | "high",
  "timeline_steps": [
    {
      "step_type": "user_intent",
      "title": "User Intent",
      "content": "...",
      "status": "success" | "warning" | "failed" | "skipped",
      "metadata": {}
    },
    {
      "step_type": "agent_plan",
      "title": "Agent Plan",
      "content": "...",
      "status": "success" | "warning" | "failed" | "skipped",
      "metadata": {}
    },
    {
      "step_type": "tool_calls",
      "title": "MCP / Tool Calls",
      "content": "...",
      "status": "success" | "warning" | "failed" | "skipped",
      "metadata": {}
    },
    {
      "step_type": "payment_request",
      "title": "Payment Request",
      "content": "...",
      "status": "success" | "warning" | "failed" | "skipped",
      "metadata": {}
    },
    {
      "step_type": "wallet_approval",
      "title": "Wallet Approval",
      "content": "...",
      "status": "success" | "warning" | "failed" | "skipped",
      "metadata": {}
    },
    {
      "step_type": "onchain_transaction",
      "title": "On-chain Transaction",
      "content": "...",
      "status": "success" | "warning" | "failed" | "skipped",
      "metadata": { "transaction_hash": "..." }
    },
    {
      "step_type": "verification",
      "title": "Verification",
      "content": "...",
      "status": "success" | "warning" | "failed" | "skipped",
      "metadata": {}
    },
    {
      "step_type": "final_result",
      "title": "Final Result",
      "content": "...",
      "status": "success" | "warning" | "failed" | "skipped",
      "metadata": {}
    }
  ],
  "transaction_summary": "2-3 sentence summary of what the transaction did",
  "verification_notes": "What was verified or could not be verified",
  "missing_evidence": "List what information is not available in the transaction data",
  "risk_flags": ["any risk indicators found"],
  "suggested_improvements": "Brief suggestions for better traceability"
}

Each content field should be 1-3 sentences. Use plain prose, no markdown bullets.`;

export type TransactionTraceInput = {
  project: Project;
  chain: string;
  tx_hash: string;
  transaction_context: TransactionContext;
  user_intent?: string;
  agent_name?: string;
};

export type TransactionTraceResult = {
  run_title: string;
  agent_name: string;
  status: RunStatus;
  risk_level: RiskLevel;
  timeline_steps: NewRunStepInput[];
  transaction_summary: string;
  verification_notes: string;
  missing_evidence: string;
  risk_flags: string[];
  suggested_improvements: string;
  source: "ai" | "mock";
};

export async function generateTransactionTrace(
  input: TransactionTraceInput,
): Promise<TransactionTraceResult> {
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL ?? DEFAULT_MODEL;

  if (apiKey && apiKey.length > 0) {
    try {
      const result = await callAnthropicForTrace(input, apiKey, model);
      return { ...result, source: "ai" };
    } catch (error) {
      console.error("AI transaction trace generation failed:", error);
      // Fall through to mock
    }
  }

  return { ...buildMockTrace(input), source: "mock" };
}

// ---------------------------------------------------------------------------
// Real path (Anthropic API)
// ---------------------------------------------------------------------------

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
};

async function callAnthropicForTrace(
  input: TransactionTraceInput,
  apiKey: string,
  model: string,
): Promise<Omit<TransactionTraceResult, "source">> {
  const prompt = `Project: ${input.project.name}
Chain: ${input.chain}
Transaction Hash: ${input.tx_hash}
${input.user_intent ? `User Intent: ${input.user_intent}\n` : ""}
${input.agent_name ? `Agent Name: ${input.agent_name}\n` : ""}

Transaction Context:
${JSON.stringify(input.transaction_context, null, 2)}

Generate the structured timeline JSON as specified in the system prompt.`;

  const body = {
    model,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status}`);
  }

  const data = (await res.json()) as AnthropicResponse;
  const text =
    data.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n")
      .trim() ?? "";

  return parseTraceJson(text);
}

function parseTraceJson(
  raw: string,
): Omit<TransactionTraceResult, "source"> {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain valid JSON.");
  }
  const obj = JSON.parse(candidate.slice(start, end + 1));

  return {
    run_title: obj.run_title ?? "Transaction Analysis",
    agent_name: obj.agent_name ?? "Transaction Analysis Agent",
    status: obj.status ?? "success",
    risk_level: obj.risk_level ?? "medium",
    timeline_steps: obj.timeline_steps ?? [],
    transaction_summary: obj.transaction_summary ?? "",
    verification_notes: obj.verification_notes ?? "",
    missing_evidence: obj.missing_evidence ?? "",
    risk_flags: obj.risk_flags ?? [],
    suggested_improvements: obj.suggested_improvements ?? "",
  };
}

// ---------------------------------------------------------------------------
// Mock path
// ---------------------------------------------------------------------------

function buildMockTrace(
  input: TransactionTraceInput,
): Omit<TransactionTraceResult, "source"> {
  const { transaction_context: tx, user_intent, agent_name } = input;

  const timeline_steps: NewRunStepInput[] = [
    {
      step_type: "user_intent",
      title: "User Intent",
      content:
        user_intent ||
        `Analyze transaction ${tx.tx_hash} on ${tx.chain} to understand the agent workflow that produced it.`,
      status: "success",
    },
    {
      step_type: "agent_plan",
      title: "Agent Plan",
      content: `The agent planned to retrieve transaction data from ${tx.chain}, parse the method signature, verify the transaction status, and generate a structured execution trace.`,
      status: "success",
    },
    {
      step_type: "tool_calls",
      title: "MCP / Tool Calls",
      content: tx.is_mock
        ? "No MCP server data available. Transaction context was generated from mock fallback."
        : `Retrieved transaction data from ${tx.chain} explorer API. Method: ${tx.method}. Gas used: ${tx.gas_used}.`,
      status: tx.is_mock ? "warning" : "success",
      metadata: tx.is_mock ? {} : { mcp_server: "blockchain-explorer", tool_name: "get_transaction" },
    },
    {
      step_type: "payment_request",
      title: "Payment Request",
      content: "Not recorded. Transaction context does not include agent payment request details.",
      status: "skipped",
    },
    {
      step_type: "wallet_approval",
      title: "Wallet Approval",
      content: `Transaction was signed by ${tx.from} and submitted to ${tx.chain}.`,
      status: "success",
    },
    {
      step_type: "onchain_transaction",
      title: "On-chain Transaction",
      content: `Transaction ${tx.tx_hash} was ${tx.status} on ${tx.chain}. Block: ${tx.block_number}. Value: ${tx.value}. Gas used: ${tx.gas_used}.`,
      status: tx.status === "success" ? "success" : tx.status === "failed" ? "failed" : "warning",
      metadata: { transaction_hash: tx.tx_hash },
    },
    {
      step_type: "verification",
      title: "Verification",
      content: tx.is_mock
        ? "Verification limited: using mock transaction data because explorer API key is not configured."
        : `Verified transaction ${tx.tx_hash} on ${tx.chain}. Status: ${tx.status}. Explorer: ${tx.explorer_url}`,
      status: tx.is_mock ? "warning" : "success",
    },
    {
      step_type: "final_result",
      title: "Final Result",
      content: `Transaction analysis complete. Status: ${tx.status}. The transaction transferred ${tx.value} from ${tx.from} to ${tx.to ?? "contract creation"} on ${tx.chain}.`,
      status: "success",
    },
  ];

  const risk_flags: string[] = [];
  if (tx.is_mock) {
    risk_flags.push("Using mock transaction data");
  }
  if (tx.status === "failed") {
    risk_flags.push("Transaction failed on-chain");
  }
  if (tx.method === "unknown") {
    risk_flags.push("Unknown method signature");
  }

  return {
    run_title: `Transaction Analysis: ${tx.tx_hash.slice(0, 10)}...`,
    agent_name: agent_name || "Transaction Analysis Agent",
    status: tx.status === "success" ? "success" : tx.status === "failed" ? "failed" : "warning",
    risk_level: tx.is_mock || tx.status === "failed" ? "medium" : "low",
    timeline_steps,
    transaction_summary: `Transaction ${tx.tx_hash} on ${tx.chain} transferred ${tx.value} from ${tx.from} to ${tx.to ?? "a contract"}. Status: ${tx.status}. Gas used: ${tx.gas_used}.`,
    verification_notes: tx.is_mock
      ? "Verification is limited because explorer API key is not configured. Using mock transaction data."
      : `Transaction verified on ${tx.chain} explorer. Block ${tx.block_number} at ${tx.timestamp}.`,
    missing_evidence: [
      "Agent planning logs not available from transaction data alone",
      "MCP server invocation details not recorded on-chain",
      "Payment request details not available",
      tx.method === "unknown" || tx.method.startsWith("0x")
        ? "Method signature could not be decoded"
        : null,
    ]
      .filter(Boolean)
      .join(". "),
    risk_flags,
    suggested_improvements:
      "To improve traceability, configure explorer API keys and record agent planning and MCP invocations off-chain before transaction submission.",
  };
}
