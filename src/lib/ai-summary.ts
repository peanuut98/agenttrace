/**
 * AI Summary generation.
 *
 * Routes through the pluggable AI provider layer (`src/lib/ai/providers`).
 * Default provider is Z.ai GLM-5.1 (AI_PROVIDER=z_ai). Other supported
 * providers: claude_compatible, mock. If the selected provider fails, the
 * layer falls back to mock and populates fallback_reason so the UI can
 * surface why the report is not live.
 *
 * Server-only — API keys are read on the server and never reach the browser.
 */

import "server-only";
import type { ReceiptJson, ReceiptAiSummary } from "@/types/receipt";
import { generateAIAuditReport } from "@/lib/ai/providers";

/**
 * Public entrypoint. Routes through the provider layer; if the configured
 * provider fails, the provider itself falls back to mock so the UI never
 * gets a 500.
 */
export async function generateAiSummary(
  receiptJson: ReceiptJson,
): Promise<ReceiptAiSummary> {
  const { project, run, execution_trace } = receiptJson;

  const executionSteps = Object.entries(execution_trace)
    .filter(([, step]) => step !== null)
    .map(([key, step]) => ({
      step: key,
      status: step!.status,
      content: step!.content,
      metadata: step!.metadata ?? undefined,
    }));

  const txContext = (receiptJson.metadata as Record<string, unknown>)
    ?.transaction_context as
    | {
        tx_hash?: string;
        transaction_hash?: string;
        chain?: string;
        status?: string;
        from?: string;
        to?: string;
        value?: string;
        method?: string;
      }
    | undefined;

  const report = await generateAIAuditReport({
    project_name: project.name,
    run_name: run.title,
    user_intent: execution_trace.user_intent?.content,
    execution_steps: executionSteps,
    transaction_context: txContext
      ? {
          hash: txContext.tx_hash ?? txContext.transaction_hash,
          chain: txContext.chain,
          status: txContext.status,
          from: txContext.from,
          to: txContext.to,
          value: txContext.value,
          method: txContext.method,
        }
      : undefined,
    receipt_json: receiptJson,
  });

  // Map provider source to the receipt summary source. is_mock wins so a
  // fallback always shows as mock in the UI, with fallback_reason explaining
  // why.
  const source: ReceiptAiSummary["source"] = report.is_mock
    ? "mock"
    : report.source === "z_ai"
      ? "z_ai"
      : report.source === "claude_compatible"
        ? "claude_compatible"
        : "ai";

  return {
    run_summary: report.executive_summary,
    technical_flow: report.technical_flow,
    audit_notes: report.audit_notes,
    source,
    generated_at: report.generated_at,
    executive_summary: report.executive_summary,
    missing_evidence: report.missing_evidence,
    risk_flags: report.risk_flags,
    suggested_improvements: report.suggested_improvements,
    audit_readiness_score: report.audit_readiness_score,
    model: report.model,
    fallback_reason: report.fallback_reason,
    fallback_detail: report.fallback_detail,
    attempted_provider: report.attempted_provider,
    attempted_model: report.attempted_model,
  };
}
