/**
 * AI Provider Entry Point
 * Routes to the configured AI provider based on AI_PROVIDER env var
 */

import { AIProvider, AIAuditReportInput, AIAuditReport } from '../types';
import { ClaudeCompatibleProvider } from './claude-compatible';
import { MockAIProvider } from './mock';

/**
 * Get the configured AI provider instance
 */
function getProvider(): AIProvider {
  const providerType = process.env.AI_PROVIDER || 'mock';

  switch (providerType) {
    case 'claude_compatible':
      return new ClaudeCompatibleProvider();
    case 'mock':
    default:
      return new MockAIProvider();
  }
}

/**
 * Generate AI Audit Report
 * Unified entry point for all AI audit report generation
 */
export async function generateAIAuditReport(
  input: AIAuditReportInput
): Promise<AIAuditReport> {
  const provider = getProvider();
  return provider.generateAuditReport(input);
}

// Re-export types for convenience
export type { AIAuditReportInput, AIAuditReport } from '../types';
