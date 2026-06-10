"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Calendar, ExternalLink, Layers, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { TraceTimeline } from "@/components/trace-timeline";
import { StatusBadge } from "@/components/status-badge";
import { RiskBadge } from "@/components/risk-badge";
import { ReceiptPanel } from "@/components/receipt-panel";
import { SummaryPanel } from "@/components/summary-panel";
import { SharePanel } from "@/components/share-panel";
import {
  getProjectBrowser,
  getReceiptForRunBrowser,
  getRunBrowser,
  listStepsForRunBrowser,
} from "@/lib/storage";
import type { Project } from "@/types/project";
import type { Receipt } from "@/types/receipt";
import type { Run, RunStep } from "@/types/run";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type LoadState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ready"; run: Run; steps: RunStep[]; project: Project | null };

export function RunDetailClient({ runId }: { runId: string }) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  // undefined while loading from storage, null when no receipt exists yet.
  const [receipt, setReceipt] = useState<Receipt | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const run = await getRunBrowser(runId);
        if (cancelled) return;
        if (!run) {
          setState({ kind: "missing" });
          return;
        }
        const [steps, project, savedReceipt] = await Promise.all([
          listStepsForRunBrowser(runId),
          getProjectBrowser(run.project_id),
          getReceiptForRunBrowser(runId),
        ]);
        if (cancelled) return;
        setState({ kind: "ready", run, steps, project });
        setReceipt(savedReceipt);
      } catch {
        if (!cancelled) setState({ kind: "missing" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  if (state.kind === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-4xl items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading run…
      </div>
    );
  }

  if (state.kind === "missing") {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/dashboard">
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
        </Button>
        <EmptyState
          title="Run not found."
          description="It may have been deleted, or it doesn't belong to this account."
        />
      </div>
    );
  }

  const { run, steps, project } = state;
  const backHref = project ? `/projects/${project.id}` : "/dashboard";
  const backLabel = project ? "Back to project" : "Back to dashboard";

  const isFromTransaction = run.metadata?.generated_from_transaction === true;
  const txHash = run.metadata?.transaction_hash as string | undefined;
  const txChain = run.metadata?.transaction_chain as string | undefined;
  const analysisSource = run.metadata?.analysis_source as "ai" | "mock" | undefined;

  function handleRunUpdate(updatedRun: Run) {
    setState({ kind: "ready", run: updatedRun, steps, project });
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl tracking-tight">
                  {run.title}
                </CardTitle>
                {isFromTransaction && (
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="size-3" />
                    Generated from Transaction
                  </Badge>
                )}
              </div>
              <CardDescription className="inline-flex items-center gap-1.5">
                <Bot className="size-3.5" />
                {run.agent_name}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={run.status} />
              <RiskBadge risk={run.risk_level} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <DetailRow
            icon={<Layers className="size-4" />}
            label="Project"
            value={
              project ? (
                <Link
                  href={`/projects/${project.id}`}
                  className="font-medium underline underline-offset-4 hover:text-foreground"
                >
                  {project.name}
                </Link>
              ) : (
                <span className="font-mono text-muted-foreground">
                  {run.project_id}
                </span>
              )
            }
          />
          <DetailRow
            icon={<Calendar className="size-4" />}
            label="Created"
            value={
              <span className="font-mono">
                {dateFormatter.format(new Date(run.created_at))}
              </span>
            }
          />
          {project?.chain ? (
            <DetailRow
              icon={<Layers className="size-4" />}
              label="Chain"
              value={
                <Badge variant="secondary" className="font-medium">
                  {project.chain}
                </Badge>
              }
            />
          ) : null}
          {isFromTransaction && txHash && (
            <DetailRow
              icon={<ExternalLink className="size-4" />}
              label="Transaction"
              value={
                <a
                  href={getExplorerUrl(txChain ?? "Base Sepolia", txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-sm underline underline-offset-4 hover:text-foreground"
                >
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  <ExternalLink className="size-3" />
                </a>
              }
            />
          )}
          {isFromTransaction && analysisSource && (
            <DetailRow
              icon={<Sparkles className="size-4" />}
              label="Analysis"
              value={
                <span className="text-sm">
                  {analysisSource === "ai" ? "Generated by AI" : "Mock analysis"}
                </span>
              }
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trace timeline</CardTitle>
          <CardDescription>
            Eight canonical steps from intent to final result.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TraceTimeline steps={steps} />
        </CardContent>
      </Card>

      {project ? (
        <>
          <SharePanel run={run} onRunChange={handleRunUpdate} />
          <ReceiptPanel
            run={run}
            project={project}
            steps={steps}
            receipt={receipt}
            onReceiptChange={setReceipt}
          />
          <SummaryPanel
            receipt={receipt ?? null}
            onSummaryUpdated={setReceipt}
          />
        </>
      ) : null}
    </div>
  );
}

function getExplorerUrl(chain: string, txHash: string): string {
  const baseUrls: Record<string, string> = {
    "Base Sepolia": "https://sepolia.basescan.org",
    "Ethereum Sepolia": "https://sepolia.etherscan.io",
  };
  const baseUrl = baseUrls[chain] ?? "https://sepolia.basescan.org";
  return `${baseUrl}/tx/${txHash}`;
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}
