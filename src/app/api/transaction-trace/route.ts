import { NextRequest, NextResponse } from "next/server";
import { generateTransactionTrace } from "@/lib/ai-transaction-trace";
import { fetchTransactionContext } from "@/lib/web3/transaction";
import type { Project } from "@/types/project";

export const dynamic = "force-dynamic";

type RequestBody = {
  project: Project;
  chain: string;
  tx_hash: string;
  user_intent?: string;
  agent_name?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;

    if (!body.chain || !body.tx_hash || !body.project) {
      return NextResponse.json(
        { error: "Missing required fields: chain, tx_hash, project" },
        { status: 400 },
      );
    }

    const transaction_context = await fetchTransactionContext(
      body.chain,
      body.tx_hash,
    );

    const result = await generateTransactionTrace({
      project: body.project,
      chain: body.chain,
      tx_hash: body.tx_hash,
      transaction_context,
      user_intent: body.user_intent,
      agent_name: body.agent_name,
    });

    return NextResponse.json({
      ...result,
      transaction_context,
    });
  } catch (error) {
    console.error("Transaction trace generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate transaction trace",
      },
      { status: 500 },
    );
  }
}
