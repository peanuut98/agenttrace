import { NextResponse } from "next/server";
import {
  buildChatCompletionsUrl,
  classifyHttpError,
  extractJSON,
  extractMessageContent,
} from "@/lib/ai/providers/_shared";

/**
 * GET /api/debug/test-zai
 *
 * Sends a minimal "reply with JSON" prompt to Z.ai and returns the result of
 * each step (HTTP status, body preview, parsed JSON). Only available when
 * NEXT_PUBLIC_DEV_MODE is "true" — returns 404 in production.
 *
 * NEVER logs or returns the API key. The request URL, model, status code and
 * response body preview are returned so we can diagnose:
 *   - missing_api_key
 *   - missing_base_url
 *   - missing_model
 *   - unauthorized       (HTTP 401/403)
 *   - insufficient_balance (HTTP 402 / "insufficient balance")
 *   - model_not_found    (HTTP 404 / "model_not_found" / "no available channel")
 *   - invalid_request    (HTTP 400/422)
 *   - invalid_response_format (no choices[0].message.content)
 *   - json_parse_error   (model output not parseable as JSON)
 *   - network_error      (fetch threw)
 *   - unknown_error      (any other status)
 */
export async function GET() {
  if (process.env.NEXT_PUBLIC_DEV_MODE !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const apiKey = process.env.ZAI_API_KEY || "";
  const apiBase = process.env.ZAI_API_BASE || "https://api.z.ai/api/paas/v4";
  const model = process.env.ZAI_MODEL || "glm-5.1";

  const base = {
    provider: "z_ai" as const,
    model,
    apiBaseConfigured: Boolean(process.env.ZAI_API_BASE),
    apiKeyConfigured: Boolean(apiKey),
  };

  if (!apiKey) {
    return NextResponse.json({
      ...base,
      ok: false,
      fallback_reason: "missing_api_key",
      errorPreview: "ZAI_API_KEY is not set",
    });
  }

  let url: string;
  try {
    url = buildChatCompletionsUrl(apiBase);
  } catch (err) {
    return NextResponse.json({
      ...base,
      ok: false,
      fallback_reason: "missing_base_url",
      errorPreview: err instanceof Error ? err.message : "invalid base URL",
    });
  }

  const requestBody = {
    model,
    messages: [
      {
        role: "system",
        content:
          'Return ONLY this exact JSON object and nothing else: {"ok": true, "provider": "z_ai"}',
      },
      {
        role: "user",
        content:
          'Return ONLY the JSON object specified in the system prompt. No markdown, no prose.',
      },
    ],
    temperature: 0,
  };

  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    return NextResponse.json({
      ...base,
      ok: false,
      requestUrl: url,
      fallback_reason: "network_error",
      errorPreview: err instanceof Error ? err.message : "fetch threw",
      elapsedMs: Date.now() - startedAt,
    });
  }

  const elapsedMs = Date.now() - startedAt;
  const text = await response.text().catch(() => "");

  if (!response.ok) {
    const { code, detail } = classifyHttpError(response.status, text);
    return NextResponse.json({
      ...base,
      ok: false,
      requestUrl: url,
      status: response.status,
      statusText: response.statusText,
      elapsedMs,
      fallback_reason: code,
      errorPreview: text.slice(0, 500),
      detail,
    });
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return NextResponse.json({
      ...base,
      ok: false,
      requestUrl: url,
      status: response.status,
      elapsedMs,
      fallback_reason: "invalid_response_format",
      errorPreview: text.slice(0, 500),
    });
  }

  const content = extractMessageContent(data);
  if (!content) {
    return NextResponse.json({
      ...base,
      ok: false,
      requestUrl: url,
      status: response.status,
      elapsedMs,
      fallback_reason: "invalid_response_format",
      errorPreview:
        typeof text === "string" ? text.slice(0, 500) : "no content extracted",
    });
  }

  const parsedJson = extractJSON(content);
  if (!parsedJson) {
    return NextResponse.json({
      ...base,
      ok: false,
      requestUrl: url,
      status: response.status,
      elapsedMs,
      fallback_reason: "json_parse_error",
      errorPreview: content.slice(0, 500),
    });
  }

  return NextResponse.json({
    ...base,
    ok: true,
    requestUrl: url,
    status: response.status,
    elapsedMs,
    parsedJson,
  });
}
