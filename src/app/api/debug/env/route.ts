import { NextResponse } from "next/server";
import { buildChatCompletionsUrl } from "@/lib/ai/providers/_shared";

/**
 * GET /api/debug/env
 *
 * Diagnostic endpoint for verifying that server-side AI provider environment
 * variables are loaded correctly. Only available when NEXT_PUBLIC_DEV_MODE is
 * "true" — returns 404 in production.
 *
 * NEVER returns API key plaintext. Only returns boolean flags or
 * "configured"/"missing" status strings, plus the computed Z.ai request URL
 * (which contains no secrets).
 */
export async function GET() {
  if (process.env.NEXT_PUBLIC_DEV_MODE !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const zaiBase = process.env.ZAI_API_BASE || "https://api.z.ai/api/paas/v4";
  let expectedZaiUrl: string;
  try {
    expectedZaiUrl = buildChatCompletionsUrl(zaiBase);
  } catch {
    expectedZaiUrl = "invalid base URL";
  }

  return NextResponse.json({
    AI_PROVIDER: process.env.AI_PROVIDER || "missing",

    // Z.ai GLM-5.1 (primary)
    hasZaiKey: Boolean(process.env.ZAI_API_KEY),
    zaiBase: process.env.ZAI_API_BASE ? "configured" : "missing",
    zaiModel: process.env.ZAI_MODEL || "missing",
    expectedZaiUrl,

    // Claude-compatible (fallback)
    hasClaudeCompatibleKey: Boolean(process.env.CLAUDE_COMPATIBLE_API_KEY),
    claudeCompatibleBase: process.env.CLAUDE_COMPATIBLE_API_BASE
      ? "configured"
      : "missing",
    claudeCompatibleModel: process.env.CLAUDE_COMPATIBLE_MODEL || "missing",

    // Explorers
    hasEtherscanKey: Boolean(process.env.ETHERSCAN_API_KEY),
    hasBasescanKey: Boolean(process.env.BASESCAN_API_KEY),

    nodeEnv: process.env.NODE_ENV,
  });
}
