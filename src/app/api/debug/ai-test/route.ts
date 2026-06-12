import { NextResponse } from "next/server";

/**
 * GET /api/debug/ai-test
 *
 * Live diagnostic that calls the configured AI provider with a minimal prompt
 * and returns the raw HTTP status / parsed content. Helps figure out why the
 * provider is falling back to mock.
 *
 * Only available when NEXT_PUBLIC_DEV_MODE is "true". Never returns the API
 * key plaintext — only returns whether things connected and what the upstream
 * status / error was.
 *
 * Tests Z.ai when AI_PROVIDER=z_ai (the recommended primary), and the
 * Claude-compatible API when AI_PROVIDER=claude_compatible.
 */
export async function GET() {
  if (process.env.NEXT_PUBLIC_DEV_MODE !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const provider = (process.env.AI_PROVIDER || "z_ai").toLowerCase();

  if (provider === "z_ai" || provider === "zai" || provider === "z.ai") {
    return testZai();
  }
  if (provider === "claude_compatible") {
    return testClaudeCompatible();
  }

  return NextResponse.json({
    AI_PROVIDER: provider,
    result: "skipped",
    reason: `AI_PROVIDER='${provider}' uses the mock provider — nothing to ping`,
  });
}

async function testZai() {
  const apiKey = process.env.ZAI_API_KEY || "";
  const apiBase = process.env.ZAI_API_BASE || "https://api.z.ai/api/paas/v4";
  const model = process.env.ZAI_MODEL || "glm-5.1";

  const checks: Record<string, unknown> = {
    AI_PROVIDER: "z_ai",
    hasApiKey: Boolean(apiKey),
    apiKeyLength: apiKey.length,
    hasApiBase: Boolean(apiBase),
    apiBasePreview: apiBase
      ? `${apiBase.slice(0, 20)}...${apiBase.slice(-10)}`
      : "missing",
    model,
  };

  if (!apiKey) {
    return NextResponse.json({
      ...checks,
      result: "skipped",
      reason: "ZAI_API_KEY missing — provider would fall back to mock",
    });
  }

  let url = apiBase.trim();
  if (url.endsWith("/")) url = url.slice(0, -1);
  if (!url.endsWith("/chat/completions")) url = `${url}/chat/completions`;

  return pingChatCompletions(url, apiKey, model, checks);
}

async function testClaudeCompatible() {
  const apiKey = process.env.CLAUDE_COMPATIBLE_API_KEY || "";
  const apiBase = process.env.CLAUDE_COMPATIBLE_API_BASE || "";
  const model = process.env.CLAUDE_COMPATIBLE_MODEL || "";

  const checks: Record<string, unknown> = {
    AI_PROVIDER: "claude_compatible",
    hasApiKey: Boolean(apiKey),
    apiKeyLength: apiKey.length,
    hasApiBase: Boolean(apiBase),
    apiBasePreview: apiBase
      ? `${apiBase.slice(0, 20)}...${apiBase.slice(-10)}`
      : "missing",
    model: model || "missing",
  };

  if (!apiKey || !apiBase) {
    return NextResponse.json({
      ...checks,
      result: "skipped",
      reason: "API key or base URL missing — provider would fall back to mock",
    });
  }

  let url = apiBase.trim();
  if (url.endsWith("/")) url = url.slice(0, -1);
  if (!url.includes("/v1")) url = `${url}/v1`;
  if (!url.endsWith("/chat/completions")) url = `${url}/chat/completions`;

  return pingChatCompletions(url, apiKey, model, checks);
}

async function pingChatCompletions(
  url: string,
  apiKey: string,
  model: string,
  checks: Record<string, unknown>,
) {
  const requestBody = {
    model,
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Reply with the single word: pong" },
    ],
    temperature: 0,
    max_tokens: 16,
  };

  const startedAt = Date.now();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const elapsedMs = Date.now() - startedAt;
    const text = await res.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    let extractedContent: string | null = null;
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      const choices = obj.choices as
        | Array<{ message?: { content?: string } }>
        | undefined;
      extractedContent = choices?.[0]?.message?.content ?? null;
    }

    return NextResponse.json({
      ...checks,
      result: res.ok ? "ok" : "http_error",
      requestUrl: url,
      httpStatus: res.status,
      httpStatusText: res.statusText,
      elapsedMs,
      responseIsJson: parsed !== null,
      responsePreview: text.slice(0, 500),
      extractedContent,
    });
  } catch (err) {
    return NextResponse.json({
      ...checks,
      result: "fetch_threw",
      requestUrl: url,
      errorName: err instanceof Error ? err.name : "Unknown",
      errorMessage: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - startedAt,
    });
  }
}
