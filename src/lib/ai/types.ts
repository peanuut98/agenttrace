/**
 * AI Provider Types
 * Unified types for all AI providers in AgentTrace
 */

export interface AIAuditReportInput {
  project_name: string;
  project_description?: string;
  run_name: string;
  user_intent?: string;
  execution_steps: Array<{
    step: string;
    status: string;
    content: string;
    metadata?: Record<string, unknown>;
  }>;
  transaction_context?: {
    hash?: string;
    chain?: string;
    status?: string;
    from?: string;
    to?: string;
    value?: string;
    method?: string;
  };
  receipt_json?: unknown;
}

export interface AIAuditReport {
  executive_summary: string;
  technical_flow: string;
  audit_notes: string;
  missing_evidence: string[];
  risk_flags: Array<{
    level: 'low' | 'medium' | 'high';
    item: string;
  }>;
  suggested_improvements: string[];
  audit_readiness_score: number;
  source: 'claude_compatible' | 'anthropic' | 'mock';
  is_mock: boolean;
  model: string;
  generated_at: string;
}

export interface AIProvider {
  generateAuditReport(input: AIAuditReportInput): Promise<AIAuditReport>;
}
