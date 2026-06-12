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

export type AIReportSourceTag =
  | 'z_ai'
  | 'claude_compatible'
  | 'anthropic'
  | 'mock';

/**
 * Structured fallback codes. The set is closed so the UI can map each code
 * to actionable guidance. Free-form details belong in fallback_detail.
 */
export type FallbackReasonCode =
  | 'missing_api_key'
  | 'missing_base_url'
  | 'missing_model'
  | 'unauthorized'
  | 'insufficient_balance'
  | 'model_not_found'
  | 'invalid_request'
  | 'invalid_response_format'
  | 'json_parse_error'
  | 'network_error'
  | 'unknown_error';

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
  source: AIReportSourceTag;
  is_mock: boolean;
  model: string;
  generated_at: string;
  /**
   * Structured fallback code, present on every mock fallback path. Always one
   * of FallbackReasonCode — closed set.
   */
  fallback_reason?: FallbackReasonCode;
  /**
   * Optional human-readable detail (e.g. "HTTP 503 model_not_found"). Never
   * contains API keys.
   */
  fallback_detail?: string;
  /**
   * The provider that was selected at routing time. Useful when fallback
   * happened so the UI can say "Attempted provider: z_ai".
   */
  attempted_provider?: AIReportSourceTag;
  /**
   * The model that was attempted before the fallback. Useful when the model
   * name was wrong (model_not_found) so the UI can show the bad name.
   */
  attempted_model?: string;
}

export interface AIProvider {
  generateAuditReport(input: AIAuditReportInput): Promise<AIAuditReport>;
}
