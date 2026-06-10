"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getProjectBrowser, createRunWithStepsBrowser, saveReceiptBrowser } from "@/lib/storage";
import { buildReceipt } from "@/lib/receipt";
import type { Project } from "@/types/project";
import type { TransactionContext } from "@/lib/web3/transaction";

const SUPPORTED_CHAINS = ["Base Sepolia", "Ethereum Sepolia"];

type AnalysisResult = {
  run_title: string;
  agent_name: string;
  status: "success" | "warning" | "failed" | "draft";
  risk_level: "low" | "medium" | "high";
  timeline_steps: Array<{
    step_type: string;
    title: string;
    content: string;
    status: string;
    metadata?: Record<string, unknown>;
  }>;
  transaction_summary: string;
  verification_notes: string;
  missing_evidence: string;
  risk_flags: string[];
  suggested_improvements: string;
  source: "ai" | "mock";
  transaction_context: TransactionContext;
};

export function ImportTransactionClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chain, setChain] = useState("Base Sepolia");
  const [txHash, setTxHash] = useState("");
  const [userIntent, setUserIntent] = useState("");
  const [agentName, setAgentName] = useState("Transaction Analysis Agent");

  useState(() => {
    getProjectBrowser(projectId).then((p) => {
      if (p) setProject(p);
    });
  });

  async function handleAnalyze() {
    if (!project) {
      setError("Project not found.");
      return;
    }

    if (!txHash.trim()) {
      setError("Transaction hash is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call API to generate transaction trace
      const response = await fetch("/api/transaction-trace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project,
          chain,
          tx_hash: txHash.trim(),
          user_intent: userIntent.trim() || undefined,
          agent_name: agentName.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to analyze transaction");
      }

      const result: AnalysisResult = await response.json();

      // Create run with steps
      const run = await createRunWithStepsBrowser({
        project_id: projectId,
        title: result.run_title,
        agent_name: result.agent_name,
        status: result.status,
        risk_level: result.risk_level,
        steps: result.timeline_steps.map((step) => ({
          step_type: step.step_type as any,
          title: step.title,
          content: step.content,
          status: step.status as any,
          metadata: step.metadata ?? null,
        })),
        metadata: {
          generated_from_transaction: true,
          transaction_hash: result.transaction_context.tx_hash,
          transaction_chain: result.transaction_context.chain,
          analysis_source: result.source,
        },
      });

      // Generate receipt
      const receipt = await buildReceipt(
        run,
        project,
        result.timeline_steps.map((step, idx) => ({
          id: `step-${idx}`,
          run_id: run.id,
          step_type: step.step_type as any,
          title: step.title,
          content: step.content,
          status: step.status as any,
          order_index: idx,
          created_at: new Date().toISOString(),
          metadata: step.metadata ?? null,
        })),
      );

      // Add transaction context to receipt JSON metadata
      const receiptWithTx = {
        ...receipt,
        receipt_json: {
          ...receipt.receipt_json,
          metadata: {
            ...receipt.receipt_json.metadata,
            transaction_context: {
              transaction_hash: result.transaction_context.tx_hash,
              chain: result.transaction_context.chain,
              analysis_source: result.source,
            },
          },
        },
      };

      await saveReceiptBrowser({
        run_id: run.id,
        project_id: projectId,
        receipt_json: receiptWithTx.receipt_json,
        receipt_hash: receiptWithTx.receipt_hash,
        markdown_export: receiptWithTx.markdown_export,
      });

      // AI summary generation happens on the run detail page via the SummaryPanel
      // (it calls /api/ai-summary which is server-side)

      // Redirect to run detail
      router.push(`/runs/${run.id}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to analyze transaction. Please try again.",
      );
      setLoading(false);
    }
  }

  if (!project) {
    return (
      <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading project…
      </div>
    );
  }

  const hasApiKey = typeof window !== "undefined" && (
    process.env.NEXT_PUBLIC_BASESCAN_API_KEY ||
    process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-3"
          disabled={loading}
        >
          <Link href={`/projects/${projectId}`}>
            <ArrowLeft className="size-4" />
            Back to project
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5" />
            Import from Transaction
          </CardTitle>
          <CardDescription>
            Enter a transaction hash to automatically generate an Agent Run
            timeline using AI analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasApiKey && (
            <Alert>
              <AlertCircle className="size-4" />
              <AlertDescription>
                Using mock transaction data because explorer API key is not
                configured. Add <code className="text-xs">NEXT_PUBLIC_BASESCAN_API_KEY</code> or{" "}
                <code className="text-xs">NEXT_PUBLIC_ETHERSCAN_API_KEY</code> to{" "}
                <code className="text-xs">.env.local</code> for real data.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="chain">Chain</Label>
            <Select value={chain} onValueChange={setChain} disabled={loading}>
              <SelectTrigger id="chain">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CHAINS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx_hash">Transaction Hash *</Label>
            <Input
              id="tx_hash"
              placeholder="0x..."
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              disabled={loading}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user_intent">User Intent (optional)</Label>
            <Textarea
              id="user_intent"
              placeholder="Describe why this transaction should be analyzed as part of an agent workflow."
              value={userIntent}
              onChange={(e) => setUserIntent(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent_name">Agent Name (optional)</Label>
            <Input
              id="agent_name"
              placeholder="Transaction Analysis Agent"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={loading || !txHash.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Analyzing transaction…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Analyze Transaction
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
