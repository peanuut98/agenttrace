import { NextResponse } from "next/server";

/**
 * GET /api/debug/env
 *
 * Diagnostic endpoint for verifying that server-side AI provider environment
 * variables are loaded correctly. Only available when NEXT_PUBLIC_DEV_MODE is
 * "true" — returns 404 in production.
 *
 * NEVER returns API key plaintext. Only returns boolean flags or "configured"/
 * "missing" status strings.
 */
export async function GET() {
  // Block access unless dev mode is explicitly enabled.
  if (process.env.NEXT_PUBLIC_DEV_MODE !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    AI_PROVIDER: process.env.AI_PROVIDER ?? "not set",
    hasClaudeCompatibleKey: Boolean(process.env.CLAUDE_COMPATIBLE_API_KEY),
    claudeCompatibleBase: process.env.CLAUDE_COMPATIBLE_API_BASE
      ? "configured"
      : "missing",
    claudeCompatibleModel: process.env.CLAUDE_COMPATIBLE_MODEL || "missing",
    hasEtherscanKey: Boolean(process.env.ETHERSCAN_API_KEY),
    hasBasescanKey: Boolean(process.env.BASESCAN_API_KEY),
    nodeEnv: process.env.NODE_ENV,
  });
}
