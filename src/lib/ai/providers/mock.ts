/**
 * Mock AI Provider
 * Returns deterministic audit reports without calling any external API
 */

import { AIProvider, AIAuditReportInput, AIAuditReport } from '../types';

export class MockAIProvider implements AIProvider {
  async generateAuditReport(input: AIAuditReportInput): Promise<AIAuditReport> {
    const { project_name, run_name, user_intent, execution_steps, transaction_context } = input;

    const intentStep = execution_steps.find((s) => s.step === 'user_intent');
    const toolStep = execution_steps.find((s) => s.step === 'tool_calls');
    const txStep = execution_steps.find((s) => s.step === 'on_chain_transaction');
    const verifyStep = execution_steps.find((s) => s.step === 'verification');

    const intent = user_intent || intentStep?.content || 'Unknown intent';
    const hasTransaction = !!transaction_context?.hash;
    const hasToolCalls = !!toolStep?.content;

    // Executive Summary
    const executive_summary = `This agent run "${run_name}" in project "${project_name}" attempted to fulfill the user intent: ${intent}. ${
      hasTransaction
        ? `A transaction was recorded on ${transaction_context.chain || 'unknown chain'}.`
        : 'No on-chain transaction was recorded.'
    } This is a mock audit report generated without AI analysis.`;

    // Technical Flow
    const technical_flow = `The execution followed these steps: ${execution_steps
      .map((s) => s.step.replace(/_/g, ' '))
      .join(' → ')}. ${
      hasToolCalls
        ? 'Tool calls were executed as part of the agent workflow.'
        : 'No MCP tool calls were recorded in this run.'
    } ${
      hasTransaction
        ? `Transaction hash: ${transaction_context.hash?.slice(0, 10)}...`
        : 'No transaction evidence provided.'
    }`;

    // Audit Notes
    const audit_notes = `Mock audit report: This report was generated using deterministic logic without AI analysis. To enable AI-powered audit reports, configure a Claude-compatible API provider. Transaction verification: ${
      hasTransaction ? 'hash provided but not verified' : 'no transaction recorded'
    }. Evidence completeness: ${
      verifyStep?.status === 'success' ? 'verification step marked as successful' : 'verification incomplete'
    }.`;

    // Missing Evidence
    const missing_evidence: string[] = [];
    if (!hasTransaction) missing_evidence.push('On-chain transaction hash');
    if (!hasToolCalls) missing_evidence.push('MCP tool call metadata');
    if (!user_intent && !intentStep) missing_evidence.push('User intent');
    if (!verifyStep || verifyStep.status !== 'success') {
      missing_evidence.push('Result verification evidence');
    }

    // Risk Flags
    const risk_flags: Array<{ level: 'low' | 'medium' | 'high'; item: string }> = [];
    if (!hasTransaction) {
      risk_flags.push({
        level: 'medium',
        item: 'No on-chain transaction evidence provided',
      });
    }
    if (!verifyStep || verifyStep.status === 'failed') {
      risk_flags.push({
        level: 'high',
        item: 'Verification step failed or missing',
      });
    }
    if (!hasToolCalls) {
      risk_flags.push({
        level: 'low',
        item: 'No MCP tool call evidence',
      });
    }

    // Suggested Improvements
    const suggested_improvements: string[] = [
      'Configure a Claude-compatible API provider for AI-powered audit analysis',
      'Add blockchain explorer API keys for transaction verification',
      'Include MCP tool call metadata in execution steps',
      'Ensure verification step completes successfully with evidence',
    ];

    // Audit Readiness Score
    let score = 100;
    if (!hasTransaction) score -= 20;
    if (!hasToolCalls) score -= 10;
    if (!verifyStep || verifyStep.status !== 'success') score -= 15;
    if (missing_evidence.length > 2) score -= 10;

    return {
      executive_summary,
      technical_flow,
      audit_notes,
      missing_evidence,
      risk_flags,
      suggested_improvements,
      audit_readiness_score: Math.max(0, score),
      source: 'mock',
      is_mock: true,
      model: 'mock-deterministic-v1',
      generated_at: new Date().toISOString(),
    };
  }
}
