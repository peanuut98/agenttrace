/**
 * Shared helpers for AI providers using OpenAI-compatible chat completions.
 *
 * These helpers never log API keys. The provider classes are responsible for
 * not putting keys into the strings passed in here.
 */

import type { FallbackReasonCode } from '../types';

/**
 * Compute the chat-completions URL from a base URL.
 *
 * - Trims whitespace and trailing slashes.
 * - Appends `/chat/completions` if missing.
 * - Does NOT inject `/v1` automatically — Z.ai's base URL already ends with
 *   `/v4`, and most third-party Claude proxies expose `/v1/chat/completions`,
 *   so callers must include `/v1`, `/v4`, etc. in ZAI_API_BASE /
 *   CLAUDE_COMPATIBLE_API_BASE themselves. (For backward compatibility, the
 *   Claude-compatible provider injects `/v1` if no version segment is found —
 *   see ClaudeCompatibleProvider.buildApiUrl.)
 */
export function buildChatCompletionsUrl(base: string): string {
  let url = base.trim();
  if (!url) throw new Error('empty base URL');
  if (url.endsWith('/')) url = url.slice(0, -1);
  if (!url.endsWith('/chat/completions')) {
    url = `${url}/chat/completions`;
  }
  return url;
}

/**
 * Extract the assistant message content from an OpenAI-compatible response.
 */
export function extractMessageContent(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const obj = data as Record<string, unknown>;
  const choices = obj.choices as Array<{ message?: { content?: string } }> | undefined;
  return choices?.[0]?.message?.content ?? '';
}

/**
 * Extract the first JSON object from a string that may include
 * ```json fences or surrounding prose. Returns null if no JSON object is
 * found or parsing fails.
 */
export function extractJSON(content: string): Record<string, unknown> | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : content).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Map an HTTP status code + response body to a structured FallbackReasonCode.
 * The body is inspected for known error markers (model_not_found,
 * insufficient balance) before falling back to the generic status mapping.
 *
 * The body is treated as untrusted — we only string-match, never eval.
 */
export function classifyHttpError(
  status: number,
  body: string,
): { code: FallbackReasonCode; detail: string } {
  const lower = body.toLowerCase();
  const detailHead = body.slice(0, 200);

  if (lower.includes('model_not_found') || lower.includes('no available channel')) {
    return { code: 'model_not_found', detail: `HTTP ${status} model_not_found: ${detailHead}` };
  }
  if (
    lower.includes('insufficient') &&
    (lower.includes('balance') || lower.includes('credit') || lower.includes('quota'))
  ) {
    return {
      code: 'insufficient_balance',
      detail: `HTTP ${status} insufficient_balance: ${detailHead}`,
    };
  }

  if (status === 401 || status === 403) {
    return { code: 'unauthorized', detail: `HTTP ${status}: ${detailHead}` };
  }
  if (status === 402) {
    return { code: 'insufficient_balance', detail: `HTTP 402: ${detailHead}` };
  }
  if (status === 404) {
    return { code: 'model_not_found', detail: `HTTP 404: ${detailHead}` };
  }
  if (status === 400 || status === 422) {
    return { code: 'invalid_request', detail: `HTTP ${status}: ${detailHead}` };
  }
  return { code: 'unknown_error', detail: `HTTP ${status}: ${detailHead}` };
}

export function stringField(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function numberField(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function stringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

export function riskFlagArray(
  v: unknown,
): Array<{ level: 'low' | 'medium' | 'high'; item: string }> {
  if (!Array.isArray(v)) return [];
  return v
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const obj = entry as Record<string, unknown>;
      const level = obj.level;
      const item = obj.item;
      if (
        (level === 'low' || level === 'medium' || level === 'high') &&
        typeof item === 'string'
      ) {
        return { level, item };
      }
      return null;
    })
    .filter(
      (
        x,
      ): x is { level: 'low' | 'medium' | 'high'; item: string } => x !== null,
    );
}
