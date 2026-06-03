"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Cpu,
  FlaskConical,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateReceiptSummaryBrowser } from "@/lib/storage";
import type { Receipt, ReceiptAiSummary } from "@/types/receipt";
import { cn } from "@/lib/utils";

type SummaryPanelProps = {
  receipt: Receipt | null;
  onSummaryUpdated: (receipt: Receipt) => void;
};

type Toast =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function SummaryPanel({ receipt, onSummaryUpdated }: SummaryPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  async function handleGenerate() {
    if (!receipt) return;
    setGenerating(true);
    setToast(null);
    try {
      const res = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ receipt_json: receipt.receipt_json }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? `API responded ${res.status}.`);
      }
      const summary = (await res.json()) as ReceiptAiSummary;
      const updated = await updateReceiptSummaryBrowser(receipt.run_id, summary);
      onSummaryUpdated(updated);
      setToast({
        kind: "success",
        message:
          summary.source === "mock"
            ? "Mock summary generated."
            : "AI summary generated.",
      });
    } catch (err: unknown) {
      setToast({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Failed to generate summary.",
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <Sparkles className="size-4" />
              AI Summary
            </CardTitle>
            <CardDescription>
              Reviewer-friendly explanation of what this run did, how it ran,
              and what an auditor should know.
            </CardDescription>
          </div>
          {receipt ? (
            <Button onClick={handleGenerate} disabled={generating} size="sm">
              {generating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating…
                </>
              ) : receipt.ai_summary ? (
                <>
                  <RefreshCw className="size-4" />
                  Regenerate AI summary
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate AI summary
                </>
              )}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!receipt ? (
          <p className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
            Generate a Task Receipt first. The AI summary is built from the
            receipt JSON.
          </p>
        ) : (
          <>
            {toast ? <ToastMessage toast={toast} /> : null}

            {receipt.ai_summary ? (
              <SummaryBody summary={receipt.ai_summary} />
            ) : (
              <p className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
                No AI summary yet. Click{" "}
                <span className="font-medium text-foreground">
                  Generate AI summary
                </span>{" "}
                to produce one from the current receipt.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryBody({ summary }: { summary: ReceiptAiSummary }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            "gap-1 font-medium",
            summary.source === "ai"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
          )}
        >
          {summary.source === "ai" ? (
            <>
              <Sparkles className="size-3" />
              AI generated
            </>
          ) : (
            <>
              <FlaskConical className="size-3" />
              Mock summary
            </>
          )}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Generated {formatTimestamp(summary.generated_at)}
        </span>
      </div>

      {summary.source === "mock" ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Using local mock summary because{" "}
          <code className="font-mono">AI_API_KEY</code> is not configured.
        </p>
      ) : null}

      <SummarySection
        icon={<ClipboardList className="size-4" />}
        title="Run summary"
        body={summary.run_summary}
      />
      <SummarySection
        icon={<Cpu className="size-4" />}
        title="Technical flow"
        body={summary.technical_flow}
      />
      <SummarySection
        icon={<ShieldCheck className="size-4" />}
        title="Audit notes"
        body={summary.audit_notes}
      />
    </div>
  );
}

function SummarySection({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <section className="space-y-1.5">
      <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-tight">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </section>
  );
}

function ToastMessage({ toast }: { toast: Toast }) {
  return (
    <p
      role={toast.kind === "error" ? "alert" : "status"}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
        toast.kind === "success"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-destructive/40 bg-destructive/10 text-destructive",
      )}
    >
      {toast.kind === "success" ? (
        <CheckCircle2 className="size-4" />
      ) : (
        <AlertCircle className="size-4" />
      )}
      {toast.message}
    </p>
  );
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
