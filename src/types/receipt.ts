import type { RiskLevel, RunStatus, StepStatus } from "@/types/run";

/**
 * Versioned schema for the receipt JSON. Bump RECEIPT_VERSION whenever the
 * shape changes so consumers can fail loudly instead of silently mis-parsing.
 */
export const RECEIPT_VERSION = "0.1.0" as const;

export type ReceiptStep = {
  step_type: string;
  title: string;
  status: StepStatus;
  content: string;
  metadata?: Record<string, unknown> | null;
};

export type ReceiptExecutionTrace = {
  user_intent: ReceiptStep | null;
  agent_plan: ReceiptStep | null;
  mcp_tool_calls: ReceiptStep | null;
  payment_request: ReceiptStep | null;
  wallet_approval: ReceiptStep | null;
  onchain_transaction: ReceiptStep | null;
  verification: ReceiptStep | null;
  final_result: ReceiptStep | null;
};

export type ReceiptJson = {
  receipt_id: string;
  project: {
    id: string;
    name: string;
    chain: string | null;
    wallet_address: string | null;
    github_url: string | null;
    demo_url: string | null;
  };
  run: {
    id: string;
    title: string;
    agent_name: string;
    status: RunStatus;
    risk_level: RiskLevel;
    created_at: string;
  };
  execution_trace: ReceiptExecutionTrace;
  web3_context: {
    chain: string | null;
    wallet_address: string | null;
    transaction_hash: string | null;
  };
  verification: {
    status: StepStatus | "unknown";
    notes: string | null;
  };
  metadata: {
    generated_at: string;
    version: typeof RECEIPT_VERSION;
  };
};

export type RiskFlag = {
  level: "low" | "medium" | "high";
  item: string;
};

export type ReceiptAiSummary = {
  run_summary: string;
  technical_flow: string;
  audit_notes: string;
  source: "mock" | "ai" | "claude_compatible";
  generated_at: string;
  // Optional Day 6 fields — backward compatible.
  executive_summary?: string;
  missing_evidence?: string[];
  risk_flags?: RiskFlag[];
  suggested_improvements?: string[];
  audit_readiness_score?: number;
};

export type Receipt = {
  id: string;
  run_id: string;
  project_id: string;
  receipt_json: ReceiptJson;
  receipt_hash: string;
  markdown_export: string;
  ai_summary: ReceiptAiSummary | null;
  created_at: string;
  updated_at: string;
};
