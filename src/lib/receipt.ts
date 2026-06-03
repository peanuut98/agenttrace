/**
 * Receipt generation utilities.
 *
 * Pure functions only — no storage, no network. Generation happens in the
 * browser today (Run Detail page) but the same functions can run server-side
 * later. Hashing uses the Web Crypto API (`crypto.subtle.digest`) so we don't
 * pull in any extra deps.
 */

import type { Project } from "@/types/project";
import type {
  Receipt,
  ReceiptExecutionTrace,
  ReceiptJson,
  ReceiptStep,
} from "@/types/receipt";
import { RECEIPT_VERSION } from "@/types/receipt";
import type { Run, RunStep, StepType } from "@/types/run";

const STEP_HEADINGS: Record<keyof ReceiptExecutionTrace, string> = {
  user_intent: "User Intent",
  agent_plan: "Agent Plan",
  mcp_tool_calls: "MCP / Tool Calls",
  payment_request: "Payment Request",
  wallet_approval: "Wallet Approval",
  onchain_transaction: "On-chain Transaction",
  verification: "Verification",
  final_result: "Final Result",
};

const STEP_TYPE_TO_TRACE_KEY: Record<StepType, keyof ReceiptExecutionTrace> = {
  user_intent: "user_intent",
  agent_plan: "agent_plan",
  tool_calls: "mcp_tool_calls",
  payment_request: "payment_request",
  wallet_approval: "wallet_approval",
  onchain_transaction: "onchain_transaction",
  verification: "verification",
  final_result: "final_result",
};

const TRACE_KEY_ORDER: Array<keyof ReceiptExecutionTrace> = [
  "user_intent",
  "agent_plan",
  "mcp_tool_calls",
  "payment_request",
  "wallet_approval",
  "onchain_transaction",
  "verification",
  "final_result",
];

function toReceiptStep(step: RunStep): ReceiptStep {
  return {
    step_type: step.step_type,
    title: step.title,
    status: step.status,
    content: step.content,
    metadata: step.metadata ?? null,
  };
}

function pickTransactionHash(steps: RunStep[]): string | null {
  const onchain = steps.find((s) => s.step_type === "onchain_transaction");
  if (!onchain) return null;
  const meta = onchain.metadata;
  if (meta && typeof meta === "object") {
    const direct = (meta as Record<string, unknown>).transaction_hash;
    if (typeof direct === "string" && direct.length > 0) return direct;
    const altKeys = ["tx_hash", "txHash", "hash"];
    for (const k of altKeys) {
      const v = (meta as Record<string, unknown>)[k];
      if (typeof v === "string" && v.length > 0) return v;
    }
  }
  // Fall back to a regex over the content. We look for an 0x-prefixed
  // 64-character hex string. If multiple match we take the first.
  const m = onchain.content.match(/0x[a-fA-F0-9]{64}/);
  return m ? m[0] : null;
}

export function generateReceiptJson(
  run: Run,
  project: Project,
  steps: RunStep[],
  options?: { receiptId?: string; generatedAt?: string },
): ReceiptJson {
  const ordered = [...steps].sort((a, b) => a.order_index - b.order_index);

  const trace: ReceiptExecutionTrace = {
    user_intent: null,
    agent_plan: null,
    mcp_tool_calls: null,
    payment_request: null,
    wallet_approval: null,
    onchain_transaction: null,
    verification: null,
    final_result: null,
  };
  for (const step of ordered) {
    const key = STEP_TYPE_TO_TRACE_KEY[step.step_type];
    if (key) trace[key] = toReceiptStep(step);
  }

  const verifyStep = trace.verification;

  return {
    receipt_id: options?.receiptId ?? newId(),
    project: {
      id: project.id,
      name: project.name,
      chain: project.chain,
      wallet_address: project.wallet_address,
      github_url: project.github_url,
      demo_url: project.demo_url,
    },
    run: {
      id: run.id,
      title: run.title,
      agent_name: run.agent_name,
      status: run.status,
      risk_level: run.risk_level,
      created_at: run.created_at,
    },
    execution_trace: trace,
    web3_context: {
      chain: project.chain,
      wallet_address: project.wallet_address,
      transaction_hash: pickTransactionHash(ordered),
    },
    verification: {
      status: verifyStep ? verifyStep.status : "unknown",
      notes: verifyStep?.content ?? null,
    },
    metadata: {
      generated_at: options?.generatedAt ?? new Date().toISOString(),
      version: RECEIPT_VERSION,
    },
  };
}

/**
 * SHA-256 of the canonical JSON. We re-stringify with sorted keys so the same
 * logical receipt produces the same hash regardless of property order.
 */
export async function generateReceiptHash(json: ReceiptJson): Promise<string> {
  const canonical = canonicalStringify(json);
  const data = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return `sha256:${bytes.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`)
    .join(",")}}`;
}

export function generateMarkdownExport(
  json: ReceiptJson,
  hash: string,
): string {
  const { project, run, execution_trace, web3_context, verification, metadata } =
    json;

  const lines: string[] = [];
  lines.push("# AgentTrace Task Receipt");
  lines.push("");

  lines.push("## Project");
  lines.push(`- Name: ${project.name}`);
  lines.push(`- Chain: ${valueOrDash(project.chain)}`);
  lines.push(`- Wallet: ${valueOrDash(project.wallet_address)}`);
  lines.push(`- GitHub: ${valueOrDash(project.github_url)}`);
  lines.push(`- Demo: ${valueOrDash(project.demo_url)}`);
  lines.push("");

  lines.push("## Agent Run");
  lines.push(`- Title: ${run.title}`);
  lines.push(`- Agent: ${run.agent_name}`);
  lines.push(`- Status: ${run.status}`);
  lines.push(`- Risk Level: ${run.risk_level}`);
  lines.push("");

  lines.push("## Execution Timeline");
  for (const key of TRACE_KEY_ORDER) {
    lines.push(`### ${STEP_HEADINGS[key]}`);
    const step = execution_trace[key];
    if (!step) {
      lines.push("_Not captured._");
      lines.push("");
      continue;
    }
    lines.push(`- Status: ${step.status}`);
    if (key === "mcp_tool_calls" && step.metadata) {
      const meta = step.metadata as Record<string, unknown>;
      const fields: Array<[string, unknown]> = [
        ["MCP Server", meta.mcp_server],
        ["Tool", meta.tool_name],
        ["Input", meta.tool_input_summary],
        ["Output", meta.tool_output_summary],
        [
          "Latency",
          typeof meta.latency_ms === "number" ? `${meta.latency_ms} ms` : null,
        ],
      ];
      for (const [label, val] of fields) {
        if (val !== null && val !== undefined && val !== "") {
          lines.push(`- ${label}: ${String(val)}`);
        }
      }
    }
    if (step.content) {
      lines.push("");
      lines.push(step.content);
    }
    lines.push("");
  }

  lines.push("## Web3 Context");
  lines.push(`- Chain: ${valueOrDash(web3_context.chain)}`);
  lines.push(`- Wallet Address: ${valueOrDash(web3_context.wallet_address)}`);
  lines.push(
    `- Transaction Hash: ${valueOrDash(web3_context.transaction_hash)}`,
  );
  lines.push("");

  lines.push("## Verification");
  lines.push(`- Status: ${verification.status}`);
  if (verification.notes) {
    lines.push("");
    lines.push(verification.notes);
  } else {
    lines.push("- Notes: —");
  }
  lines.push("");

  lines.push("## Receipt Hash");
  lines.push("```");
  lines.push(hash);
  lines.push("```");
  lines.push("");

  lines.push("## Generated At");
  lines.push(metadata.generated_at);
  lines.push("");
  lines.push(`_Receipt schema version: ${metadata.version}_`);

  return lines.join("\n");
}

function valueOrDash(value: string | null | undefined): string {
  return value && value.length > 0 ? value : "—";
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

/**
 * Convenience: build a full Receipt object (pre-storage).
 */
export async function buildReceipt(
  run: Run,
  project: Project,
  steps: RunStep[],
): Promise<Omit<Receipt, "id" | "created_at" | "updated_at">> {
  const json = generateReceiptJson(run, project, steps);
  const hash = await generateReceiptHash(json);
  const markdown = generateMarkdownExport(json, hash);
  return {
    run_id: run.id,
    project_id: project.id,
    receipt_json: json,
    receipt_hash: hash,
    markdown_export: markdown,
  };
}
