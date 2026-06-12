/**
 * Z.ai GLM-5.1 Provider
 *
 * Calls the Z.ai chat completions endpoint (OpenAI-compatible format).
 * Default base URL: https://api.z.ai/api/paas/v4
 * Default model:    glm-5.1
 *
 * On any failure, falls back to MockAIProvider with a structured
 * fallback_reason code and a short fallback_detail string. Never logs the
 * API key. attempted_provider="z_ai" and attempted_model are always set
 * on the returned report so the UI can surface what was tried.
 */

import { AIProvider, AIAuditReportInput, AIAuditReport } from '../types';
import { MockAIProvider } from './mock';
import {
  buildChatCompletionsUrl,
  classifyHttpError,
  extractJSON,
  extractMessageContent,
  numberField,
  riskFlagArray,
  stringArray,
  stringField,
} from './_shared';

const DEFAULT_MODEL = 'glm-5.1';
const DEFAULT_BASE = 'https://api.z.ai/api/paas/v4';

export class ZaiProvider implements AIProvider {
  private apiKey: string;
  private apiBase: string;
  private model: string;
  private mockFallback: MockAIProvider;

  constructor() {
    this.apiKey = process.env.ZAI_API_KEY || '';
    this.apiBase = process.env.ZAI_API_BASE || DEFAULT_BASE;
    this.model = process.env.ZAI_MODEL || DEFAULT_MODEL;
    this.mockFallback = new MockAIProvider();
  }

  async generateAuditReport(input: AIAuditReportInput): Promise<AIAuditReport> {
    if (!this.apiKey) {
      return this.fallback(input, 'missing_api_key', 'ZAI_API_KEY is not set');
    }
    if (!this.model) {
      return this.fallback(input, 'missing_model', 'ZAI_MODEL is empty');
    }
    if (!this.apiBase) {
      return this.fallback(input, 'missing_base_url', 'ZAI_API_BASE is empty');
    }

    let url: string;
    try {
      url = buildChatCompletionsUrl(this.apiBase);
    } catch (err) {
      return this.fallback(
        input,
        'missing_base_url',
        `ZAI_API_BASE invalid: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: this.buildPrompt(input) },
          ],
          temperature: 0.2,
        }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown network error';
      // Never includes the key — only the URL and the error message.
      console.error('[zai] network_error:', { url, model: this.model, message: msg });
      return this.fallback(input, 'network_error', `fetch failed: ${msg}`);
    }

    if (!response.ok) {
      const bodyText = await safeReadText(response);
      const { code, detail } = classifyHttpError(response.status, bodyText);
      console.error('[zai] http_error:', {
        url,
        model: this.model,
        status: response.status,
        statusText: response.statusText,
        bodyPreview: bodyText.slice(0, 500),
        code,
      });
      return this.fallback(input, code, detail);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      console.error('[zai] invalid_response_format: response was not valid JSON', { url, message: msg });
      return this.fallback(input, 'invalid_response_format', `response was not valid JSON: ${msg}`);
    }

    const content = extractMessageContent(data);
    if (!content) {
      console.error('[zai] invalid_response_format: missing choices[0].message.content', { url });
      return this.fallback(
        input,
        'invalid_response_format',
        'response had no choices[0].message.content',
      );
    }

    const parsed = extractJSON(content);
    if (!parsed) {
      console.error('[zai] json_parse_error: model output did not contain a JSON object', {
        url,
        model: this.model,
        contentPreview: content.slice(0, 500),
      });
      return this.fallback(
        input,
        'json_parse_error',
        `model output did not contain a JSON object: ${content.slice(0, 200)}`,
      );
    }

    return {
      executive_summary: stringField(parsed.executive_summary),
      technical_flow: stringField(parsed.technical_flow),
      audit_notes: stringField(parsed.audit_notes),
      missing_evidence: stringArray(parsed.missing_evidence),
      risk_flags: riskFlagArray(parsed.risk_flags),
      suggested_improvements: stringArray(parsed.suggested_improvements),
      audit_readiness_score: numberField(parsed.audit_readiness_score),
      source: 'z_ai',
      is_mock: false,
      model: this.model,
      generated_at: new Date().toISOString(),
      attempted_provider: 'z_ai',
      attempted_model: this.model,
    };
  }

  private async fallback(
    input: AIAuditReportInput,
    code: AIAuditReport['fallback_reason'],
    detail: string,
  ): Promise<AIAuditReport> {
    const mockReport = await this.mockFallback.generateAuditReport(input);
    return {
      ...mockReport,
      fallback_reason: code,
      fallback_detail: detail,
      attempted_provider: 'z_ai',
      attempted_model: this.model,
    };
  }

  private getSystemPrompt(): string {
    return `You are a Web3 AI Agent execution auditor for AgentTrace, a Proof-of-Execution platform.

CRITICAL RULES:
1. Only use the provided project, run, execution steps, transaction context, and receipt data.
2. Do NOT fabricate missing transactions, MCP servers, wallet approvals, payment requests, or verification evidence.
3. If evidence is missing, list it in missing_evidence.
4. If transaction method is unknown, write "unknown" — do not guess.
5. Output ONLY a valid JSON object. No markdown fences, no prose outside the JSON.
6. The report must be professional and suitable for hackathon judges, Web3 builders, and DevRel teams.
7. Be honest about data quality and completeness.

OUTPUT FORMAT (valid JSON only, no other text):
{
  "executive_summary": "2-3 sentence high-level overview of what the agent attempted and the outcome",
  "technical_flow": "4-5 sentence technical description of execution path, tools used, and transaction details",
  "audit_notes": "3-4 sentences on verification status, missing evidence, data sources, and trust level",
  "missing_evidence": ["item 1", "item 2"],
  "risk_flags": [{"level": "low|medium|high", "item": "description"}],
  "suggested_improvements": ["improvement 1", "improvement 2"],
  "audit_readiness_score": 0-100
}`;
  }

  private buildPrompt(input: AIAuditReportInput): string {
    const {
      project_name,
      project_description,
      run_name,
      user_intent,
      execution_steps,
      transaction_context,
      receipt_json,
    } = input;

    const stepsText = execution_steps
      .map((step, i) => {
        const meta = step.metadata
          ? `\n   Metadata: ${JSON.stringify(step.metadata)}`
          : '';
        return `${i + 1}. ${step.step} (${step.status}): ${step.content}${meta}`;
      })
      .join('\n');

    return `Analyze this Web3 AI Agent execution and generate an audit report as JSON.

PROJECT:
- Name: ${project_name}
- Description: ${project_description || 'Not provided'}

RUN:
- Name: ${run_name}
- User Intent: ${user_intent || 'Not provided'}

EXECUTION STEPS:
${stepsText}

TRANSACTION CONTEXT:
${transaction_context ? JSON.stringify(transaction_context, null, 2) : 'No transaction context provided'}

${receipt_json ? `RECEIPT JSON:\n${JSON.stringify(receipt_json, null, 2)}` : ''}

Return ONLY the JSON object specified in the system prompt.`;
  }
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
