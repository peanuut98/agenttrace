/**
 * AI Summary generation.
 *
 * Two paths:
 *
 * 1. Server-side helper that calls the Anthropic Messages API when AI_API_KEY
 *    is set. Lives in this file but is only invoked from the route handler
 *    (`/api/ai-summary`) so the key never reaches the client.
 *
 * 2. Mock fallback that builds a deterministic summary from the receipt JSON.
 *    This runs whenever the key is missing or the upstream call fails.
 *
 * The route handler decides which path to take and returns a uniform
 * `ReceiptAiSummary`. Callers (the SummaryPanel) only see the result.
 */

import "server-only";
import type { ReceiptJson, ReceiptAiSummary } from "@/types/receipt";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You are an audit assistant for AgentTrace, a platform that records Web3 AI Agent execution traces.

Given a JSON Task Receipt for a single Agent run, write three short sections describing only what is in the receipt. Tone: professional, concise, factual. Do not invent fields, addresses, contract names, transaction hashes, or model names that are not present. Do not market the product.

Return STRICT JSON of the form:
{
  "run_summary": "...",
  "technical_flow": "...",
  "audit_notes": "..."
}

Each value is plain prose. No markdown bullets, no headings, no code fences.

- run_summary: 2–4 sentences. What did the agent do, for whom, and what was the outcome.
- technical_flow: 3–6 sentences. Cover MCP / tool calls (server, tool, input/output if present), payment request, wallet approval, on-chain transaction, verification.
- audit_notes: 2–4 sentences. Note the run status, risk level, anything the verification step flagged, and any limits an auditor should know about (e.g. fields not present in the receipt).`;

export type GenerateOptions = {
  apiKey?: string;
  model?: string;
  signal?: AbortSignal;
};

/**
 * Public entrypoint. Picks real or mock based on whether the key is present;
 * if the real call throws, falls back to mock so the UI never gets a 500.
 */
export async function generateAiSummary(
  receiptJson: ReceiptJson,
  options: GenerateOptions = {},
): Promise<ReceiptAiSummary> {
  const apiKey = options.apiKey ?? process.env.AI_API_KEY;
  const model = options.model ?? process.env.AI_MODEL ?? DEFAULT_MODEL;

  if (apiKey && apiKey.length > 0) {
    try {
      const ai = await callAnthropic(receiptJson, apiKey, model, options.signal);
      return {
        ...ai,
        source: "ai",
        generated_at: new Date().toISOString(),
      };
    } catch {
      // Swallow upstream failures and fall through to the mock path so the
      // UI keeps working. The component shows the "mock summary" disclaimer.
    }
  }

  return {
    ...buildMockSummary(receiptJson),
    source: "mock",
    generated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Real path (Anthropic Messages API)
// ---------------------------------------------------------------------------

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
};

async function callAnthropic(
  receiptJson: ReceiptJson,
  apiKey: string,
  model: string,
  signal?: AbortSignal,
): Promise<{ run_summary: string; technical_flow: string; audit_notes: string }> {
  const body = {
    model,
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here is the receipt JSON:\n\n${JSON.stringify(receiptJson, null, 2)}\n\nReturn only the JSON object described in the system prompt.`,
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
    signal,
  });

  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}`);
  }

  const data = (await res.json()) as AnthropicResponse;
  const text =
    data.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n")
      .trim() ?? "";

  return parseSummaryJson(text);
}

function parseSummaryJson(
  raw: string,
): { run_summary: string; technical_flow: string; audit_notes: string } {
  // The model is asked for strict JSON, but we tolerate fences and chatter.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain a JSON object.");
  }
  const obj = JSON.parse(candidate.slice(start, end + 1));
  const out = {
    run_summary: typeof obj.run_summary === "string" ? obj.run_summary.trim() : "",
    technical_flow:
      typeof obj.technical_flow === "string" ? obj.technical_flow.trim() : "",
    audit_notes:
      typeof obj.audit_notes === "string" ? obj.audit_notes.trim() : "",
  };
  if (!out.run_summary || !out.technical_flow || !out.audit_notes) {
    throw new Error("AI response was missing required fields.");
  }
  return out;
}

// ---------------------------------------------------------------------------
// Mock path
// ---------------------------------------------------------------------------

function buildMockSummary(json: ReceiptJson): {
  run_summary: string;
  technical_flow: string;
  audit_notes: string;
} {
  const { project, run, execution_trace, web3_context, verification } = json;
  const intent = execution_trace.user_intent?.content?.trim();
  const finalResult = execution_trace.final_result?.content?.trim();
  const mcp = execution_trace.mcp_tool_calls;
  const mcpMeta = (mcp?.metadata ?? null) as Record<string, unknown> | null;
  const onchain = execution_trace.onchain_transaction?.content?.trim();
  const tx = web3_context.transaction_hash;
  const chain = project.chain ?? "an unspecified chain";
  const wallet = web3_context.wallet_address ?? "an unspecified wallet";

  const runSummary = [
    `${project.name} ran "${run.title}" using the ${run.agent_name} agent.`,
    intent ? `Intent: ${intent}` : null,
    finalResult ? `Outcome: ${finalResult}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const flowParts: string[] = [];
  if (mcp) {
    if (mcpMeta && (mcpMeta.tool_name || mcpMeta.mcp_server)) {
      const server = mcpMeta.mcp_server ? `the ${mcpMeta.mcp_server} MCP server` : "an MCP server";
      const tool = mcpMeta.tool_name ? ` and the ${mcpMeta.tool_name} tool` : "";
      flowParts.push(`The agent invoked ${server}${tool}.`);
      if (mcpMeta.tool_input_summary) {
        flowParts.push(`Input: ${String(mcpMeta.tool_input_summary)}.`);
      }
      if (mcpMeta.tool_output_summary) {
        flowParts.push(`Output: ${String(mcpMeta.tool_output_summary)}.`);
      }
      if (typeof mcpMeta.latency_ms === "number") {
        flowParts.push(`Tool latency was ${mcpMeta.latency_ms} ms.`);
      }
    } else if (mcp.content) {
      flowParts.push(`Tool calls: ${mcp.content}`);
    }
  }
  if (execution_trace.payment_request?.content) {
    flowParts.push(
      `Payment request: ${execution_trace.payment_request.content.trim()}`,
    );
  }
  if (execution_trace.wallet_approval?.content) {
    flowParts.push(
      `Wallet approval: ${execution_trace.wallet_approval.content.trim()}`,
    );
  }
  if (onchain || tx) {
    const txPart = tx ? ` (tx ${tx})` : "";
    flowParts.push(`On-chain transaction submitted on ${chain}${txPart}.`);
  }
  if (execution_trace.verification?.content) {
    flowParts.push(
      `Verification: ${execution_trace.verification.content.trim()}`,
    );
  }
  const technicalFlow =
    flowParts.length > 0
      ? flowParts.join(" ")
      : "Insufficient detail in the receipt to describe the technical flow.";

  const auditParts: string[] = [];
  auditParts.push(
    `Run status: ${run.status}. Risk level: ${run.risk_level}.`,
  );
  if (verification.status === "failed" || verification.status === "warning") {
    auditParts.push(
      `The verification step is ${verification.status}; a reviewer should re-check the result.`,
    );
  } else if (verification.status === "skipped") {
    auditParts.push(
      "The verification step was skipped, so the result has not been checked against expectations.",
    );
  } else if (verification.status === "success") {
    auditParts.push("Verification passed against the recorded expectations.");
  } else {
    auditParts.push("Verification status is unknown.");
  }
  if (!tx && execution_trace.onchain_transaction) {
    auditParts.push(
      "No transaction hash is recorded in the receipt; on-chain effects cannot be independently verified from this receipt alone.",
    );
  }
  auditParts.push(
    `Wallet of record: ${wallet}. The receipt does not include a private signature, only the recorded steps.`,
  );

  return {
    run_summary: runSummary,
    technical_flow: technicalFlow,
    audit_notes: auditParts.join(" "),
  };
}
