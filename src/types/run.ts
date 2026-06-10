export type RunStatus = "success" | "warning" | "failed" | "draft";
export type RiskLevel = "low" | "medium" | "high";

export type StepStatus = "success" | "warning" | "failed" | "skipped";

export type StepType =
  | "user_intent"
  | "agent_plan"
  | "tool_calls"
  | "payment_request"
  | "wallet_approval"
  | "onchain_transaction"
  | "verification"
  | "final_result";

export type Run = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  agent_name: string;
  status: RunStatus;
  risk_level: RiskLevel;
  created_at: string;
  updated_at: string;
  metadata?: RunMetadata | null;
  is_public?: boolean;
  public_id?: string | null;
  published_at?: string | null;
};

export type RunMetadata = {
  generated_from_transaction?: boolean;
  transaction_hash?: string;
  transaction_chain?: string;
  analysis_source?: "ai" | "mock";
  [key: string]: unknown;
};

export type StepMetadata = {
  mcp_server?: string;
  tool_name?: string;
  tool_input_summary?: string;
  tool_output_summary?: string;
  latency_ms?: number;
  // Free-form passthrough so callers can attach extra structured fields
  // (e.g. transaction_hash on the on-chain step) without changing this type.
  [key: string]: unknown;
};

export type RunStep = {
  id: string;
  run_id: string;
  step_type: StepType;
  title: string;
  content: string;
  status: StepStatus;
  order_index: number;
  created_at: string;
  metadata?: StepMetadata | null;
};

/**
 * Canonical 8-step trace template. Order matters — `order_index` is just the
 * array position in the create flow.
 */
export type StepTemplate = {
  step_type: StepType;
  title: string;
};

export const STEP_TEMPLATES: StepTemplate[] = [
  { step_type: "user_intent", title: "User Intent" },
  { step_type: "agent_plan", title: "Agent Plan" },
  { step_type: "tool_calls", title: "Tool Calls" },
  { step_type: "payment_request", title: "Payment Request" },
  { step_type: "wallet_approval", title: "Wallet Approval" },
  { step_type: "onchain_transaction", title: "On-chain Transaction" },
  { step_type: "verification", title: "Verification" },
  { step_type: "final_result", title: "Final Result" },
];

export const RUN_STATUS_OPTIONS: RunStatus[] = [
  "draft",
  "success",
  "warning",
  "failed",
];

export const RISK_LEVEL_OPTIONS: RiskLevel[] = ["low", "medium", "high"];

export const STEP_STATUS_OPTIONS: StepStatus[] = [
  "success",
  "warning",
  "failed",
  "skipped",
];

export type NewRunStepInput = {
  step_type: StepType;
  title: string;
  content: string;
  status: StepStatus;
  metadata?: StepMetadata | null;
};

export type NewRunInput = {
  project_id: string;
  title: string;
  agent_name: string;
  status: RunStatus;
  risk_level: RiskLevel;
  steps: NewRunStepInput[];
  metadata?: RunMetadata | null;
};
