/**
 * Claude-Compatible AI Provider
 * Works with third-party Claude API providers using OpenAI-compatible format
 */

import { AIProvider, AIAuditReportInput, AIAuditReport } from '../types';
import { MockAIProvider } from './mock';

export class ClaudeCompatibleProvider implements AIProvider {
  private apiKey: string;
  private apiBase: string;
  private model: string;
  private mockFallback: MockAIProvider;

  constructor() {
    this.apiKey = process.env.CLAUDE_COMPATIBLE_API_KEY || '';
    this.apiBase = process.env.CLAUDE_COMPATIBLE_API_BASE || '';
    this.model = process.env.CLAUDE_COMPATIBLE_MODEL || 'claude-3-5-sonnet-20241022';
    this.mockFallback = new MockAIProvider();
  }

  async generateAuditReport(input: AIAuditReportInput): Promise<AIAuditReport> {
    if (!this.apiKey || !this.apiBase) {
      console.log('[ClaudeCompatibleProvider] API key or base URL not configured, using mock fallback');
      return this.mockFallback.generateAuditReport(input);
    }

    try {
      const url = this.buildApiUrl();
      const prompt = this.buildPrompt(input);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      if (!content) {
        throw new Error('No content in API response');
      }

      // Try to parse JSON from the response
      const parsed = this.extractJSON(content);

      return {
        executive_summary: parsed.executive_summary || '',
        technical_flow: parsed.technical_flow || '',
        audit_notes: parsed.audit_notes || '',
        missing_evidence: parsed.missing_evidence || [],
        risk_flags: parsed.risk_flags || [],
        suggested_improvements: parsed.suggested_improvements || [],
        audit_readiness_score: parsed.audit_readiness_score || 0,
        source: 'claude_compatible',
        is_mock: false,
        model: this.model,
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[ClaudeCompatibleProvider] Failed to generate audit report:', error);
      console.log('[ClaudeCompatibleProvider] Falling back to mock provider');
      return this.mockFallback.generateAuditReport(input);
    }
  }

  private buildApiUrl(): string {
    let base = this.apiBase.trim();

    // Remove trailing slash
    if (base.endsWith('/')) {
      base = base.slice(0, -1);
    }

    // Add /v1 if not present
    if (!base.includes('/v1')) {
      base = `${base}/v1`;
    }

    // Add /chat/completions endpoint
    if (!base.endsWith('/chat/completions')) {
      base = `${base}/chat/completions`;
    }

    return base;
  }

  private getSystemPrompt(): string {
    return `You are a Web3 AI Agent execution auditor. Your job is to analyze agent run data and produce a structured audit report.

CRITICAL RULES:
1. Only use the provided project, run, execution steps, transaction context, and receipt data
2. Do NOT fabricate missing transactions, MCP servers, wallet approvals, payment requests, or verification evidence
3. If evidence is missing, put it into the missing_evidence array
4. If transaction method is unknown, say "unknown" - do not guess
5. Output ONLY valid JSON - no markdown, no explanation text
6. The report should be professional and suitable for hackathon judges, Web3 builders, and DevRel teams
7. Be honest about data quality and completeness

OUTPUT FORMAT (valid JSON only):
{
  "executive_summary": "2-3 sentence high-level overview of what the agent attempted and the outcome",
  "technical_flow": "4-5 sentence technical description of the execution path, tools used, and transaction details",
  "audit_notes": "3-4 sentences on verification status, missing evidence, data sources, and trust level",
  "missing_evidence": ["item 1", "item 2"],
  "risk_flags": [
    {"level": "low|medium|high", "item": "description"}
  ],
  "suggested_improvements": ["improvement 1", "improvement 2"],
  "audit_readiness_score": 0-100
}`;
  }

  private buildPrompt(input: AIAuditReportInput): string {
    const { project_name, project_description, run_name, user_intent, execution_steps, transaction_context, receipt_json } = input;

    return `Analyze this Web3 AI Agent execution and generate an audit report.

PROJECT:
- Name: ${project_name}
- Description: ${project_description || 'Not provided'}

RUN:
- Name: ${run_name}
- User Intent: ${user_intent || 'Not provided'}

EXECUTION STEPS:
${execution_steps.map((step, i) => `${i + 1}. ${step.step} (${step.status}): ${step.content}${step.metadata ? `\n   Metadata: ${JSON.stringify(step.metadata)}` : ''}`).join('\n')}

TRANSACTION CONTEXT:
${transaction_context ? JSON.stringify(transaction_context, null, 2) : 'No transaction context provided'}

${receipt_json ? `RECEIPT JSON:\n${JSON.stringify(receipt_json, null, 2)}` : ''}

Generate a structured audit report in JSON format following the system prompt requirements.`;
  }

  private extractJSON(content: string): any {
    // Try to find JSON in the content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('[ClaudeCompatibleProvider] Failed to parse JSON from response:', e);
      }
    }

    // If no JSON found or parse failed, return empty structure
    return {
      executive_summary: content.slice(0, 200) + '...',
      technical_flow: 'Failed to parse structured response',
      audit_notes: 'AI provider returned non-JSON response',
      missing_evidence: ['Structured audit report'],
      risk_flags: [{ level: 'high', item: 'Failed to generate structured audit report' }],
      suggested_improvements: ['Check AI provider configuration'],
      audit_readiness_score: 0,
    };
  }
}
