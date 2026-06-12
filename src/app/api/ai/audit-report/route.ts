import { NextResponse, type NextRequest } from "next/server";
import { generateAIAuditReport } from "@/lib/ai/providers";
import type { AIAuditReportInput } from "@/lib/ai/types";

/**
 * POST /api/ai/audit-report
 *
 * Body: AIAuditReportInput
 * Response: AIAuditReport (with `source`, `model`, `is_mock`, `fallback_reason`)
 *
 * Server-only entry point for the pluggable AI provider layer. The selected
 * provider (Z.ai GLM-5.1, Claude-compatible, or mock) is chosen by the
 * AI_PROVIDER env var. API keys never reach the browser.
 *
 * If the selected provider fails, the response will still be a valid
 * AIAuditReport with `is_mock: true` and `fallback_reason` populated.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Request body must be an AIAuditReportInput object." },
      { status: 400 },
    );
  }

  const input = body as AIAuditReportInput;
  if (
    typeof input.project_name !== "string" ||
    typeof input.run_name !== "string" ||
    !Array.isArray(input.execution_steps)
  ) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: project_name, run_name, execution_steps[].",
      },
      { status: 400 },
    );
  }

  try {
    const report = await generateAIAuditReport(input);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to generate audit report.",
      },
      { status: 500 },
    );
  }
}
