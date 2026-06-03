import { NextResponse, type NextRequest } from "next/server";
import { generateAiSummary } from "@/lib/ai-summary";
import type { ReceiptJson } from "@/types/receipt";

/**
 * POST /api/ai-summary
 * Body: { receipt_json: ReceiptJson }
 * Response: ReceiptAiSummary
 *
 * Server-only so the AI_API_KEY is never sent to the browser. If the key is
 * absent, the route still succeeds with a mock summary (source: "mock").
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const json = (body as { receipt_json?: ReceiptJson } | null)?.receipt_json;
  if (!json || typeof json !== "object") {
    return NextResponse.json(
      { error: "Missing receipt_json in request body." },
      { status: 400 },
    );
  }

  try {
    const summary = await generateAiSummary(json);
    return NextResponse.json(summary);
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to generate summary.",
      },
      { status: 500 },
    );
  }
}
