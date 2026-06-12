/**
 * AI Provider Entry Point
 *
 * Routes to the configured AI provider based on the AI_PROVIDER env var.
 * Default (and recommended for hackathon submission) is `z_ai`, which calls
 * Z.ai GLM-5.1.
 *
 * Routing rule:
 *   - AI_PROVIDER=z_ai (or zai / z.ai) → ZaiProvider (must be ATTEMPTED first;
 *     never short-circuits to mock here)
 *   - AI_PROVIDER=claude_compatible    → ClaudeCompatibleProvider
 *   - AI_PROVIDER=mock                 → MockAIProvider directly
 *   - any other value                  → MockAIProvider with a console warning
 *
 * Each non-mock provider is responsible for its own fallback to mock if its
 * upstream call fails — and it must populate fallback_reason / fallback_detail
 * / attempted_provider / attempted_model on the returned report.
 */

import { AIProvider, AIAuditReportInput, AIAuditReport } from '../types';
import { ZaiProvider } from './zai';
import { ClaudeCompatibleProvider } from './claude-compatible';
import { MockAIProvider } from './mock';

type ProviderTag = 'z_ai' | 'claude_compatible' | 'mock';

function resolveProviderTag(): ProviderTag {
  const raw = (process.env.AI_PROVIDER || 'z_ai').toLowerCase().trim();
  if (raw === 'z_ai' || raw === 'zai' || raw === 'z.ai') return 'z_ai';
  if (raw === 'claude_compatible') return 'claude_compatible';
  if (raw === 'mock') return 'mock';
  console.warn(
    `[ai] Unknown AI_PROVIDER='${raw}' — falling back to mock provider. ` +
      `Valid values: z_ai, claude_compatible, mock.`,
  );
  return 'mock';
}

function instantiateProvider(tag: ProviderTag): AIProvider {
  switch (tag) {
    case 'z_ai':
      return new ZaiProvider();
    case 'claude_compatible':
      return new ClaudeCompatibleProvider();
    case 'mock':
      return new MockAIProvider();
  }
}

/**
 * Generate AI Audit Report.
 * Unified entry point for all AI audit report generation.
 */
export async function generateAIAuditReport(
  input: AIAuditReportInput,
): Promise<AIAuditReport> {
  const tag = resolveProviderTag();

  console.info('[ai] selected provider:', tag);
  if (tag !== 'mock') {
    console.info('[ai] attempting provider:', tag);
  }

  const provider = instantiateProvider(tag);
  const report = await provider.generateAuditReport(input);

  if (report.is_mock && report.fallback_reason) {
    console.warn('[ai] fallback to mock:', {
      attempted_provider: report.attempted_provider ?? tag,
      attempted_model: report.attempted_model,
      fallback_reason: report.fallback_reason,
      fallback_detail: report.fallback_detail,
    });
  } else if (!report.is_mock) {
    console.info('[ai] provider call ok:', {
      source: report.source,
      model: report.model,
    });
  }

  return report;
}

export type { AIAuditReportInput, AIAuditReport } from '../types';
