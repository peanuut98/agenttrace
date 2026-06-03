"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  FileJson,
  FileText,
  Hash,
  Loader2,
  RefreshCw,
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
import { buildReceipt } from "@/lib/receipt";
import { saveReceiptBrowser } from "@/lib/storage";
import type { Project } from "@/types/project";
import type { Receipt } from "@/types/receipt";
import type { Run, RunStep } from "@/types/run";
import { cn } from "@/lib/utils";

type ReceiptPanelProps = {
  run: Run;
  project: Project;
  steps: RunStep[];
  /** undefined = still loading; null = no receipt yet; Receipt = saved one */
  receipt: Receipt | null | undefined;
  onReceiptChange: (receipt: Receipt) => void;
};

type Toast =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function ReceiptPanel({
  run,
  project,
  steps,
  receipt,
  onReceiptChange,
}: ReceiptPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  async function handleGenerate() {
    setGenerating(true);
    setToast(null);
    try {
      const partial = await buildReceipt(run, project, steps);
      const saved = await saveReceiptBrowser(partial);
      onReceiptChange(saved);
      setToast({
        kind: "success",
        message: receipt ? "Receipt regenerated." : "Receipt generated.",
      });
    } catch (err: unknown) {
      setToast({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Failed to generate receipt.",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ kind: "success", message: `${label} copied to clipboard.` });
    } catch {
      setToast({ kind: "error", message: `Failed to copy ${label}.` });
    }
  }

  if (receipt === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-lg">
            <Sparkles className="size-4" />
            Task Receipt
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Checking for an existing receipt…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <Sparkles className="size-4" />
              Task Receipt
            </CardTitle>
            <CardDescription>
              Structured JSON + Markdown export with a SHA-256 receipt hash.
            </CardDescription>
          </div>
          <Button onClick={handleGenerate} disabled={generating} size="sm">
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating…
              </>
            ) : receipt ? (
              <>
                <RefreshCw className="size-4" />
                Regenerate receipt
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Generate receipt
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {toast ? <ToastMessage toast={toast} /> : null}

        {!receipt ? (
          <p className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
            No receipt yet. Click{" "}
            <span className="font-medium text-foreground">
              Generate receipt
            </span>{" "}
            to produce a structured JSON + Markdown export of this run.
          </p>
        ) : (
          <ReceiptBody
            receipt={receipt}
            showJson={showJson}
            onToggleJson={() => setShowJson((v) => !v)}
            onCopyJson={() =>
              copyToClipboard(
                JSON.stringify(receipt.receipt_json, null, 2),
                "JSON",
              )
            }
            onCopyMarkdown={() =>
              copyToClipboard(receipt.markdown_export, "Markdown")
            }
            onCopyHash={() => copyToClipboard(receipt.receipt_hash, "Hash")}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ReceiptBody({
  receipt,
  showJson,
  onToggleJson,
  onCopyJson,
  onCopyMarkdown,
  onCopyHash,
}: {
  receipt: Receipt;
  showJson: boolean;
  onToggleJson: () => void;
  onCopyJson: () => void;
  onCopyMarkdown: () => void;
  onCopyHash: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Hash className="size-3" />
          Receipt hash
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="max-w-full truncate font-mono text-xs"
            title={receipt.receipt_hash}
          >
            {receipt.receipt_hash}
          </Badge>
          <Button variant="ghost" size="sm" onClick={onCopyHash}>
            <Copy className="size-3.5" />
            Copy
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          SHA-256 of the canonicalized receipt JSON.
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <FileJson className="size-3" />
            JSON receipt
          </p>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onToggleJson}>
              {showJson ? "Collapse" : "Expand"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCopyJson}>
              <Copy className="size-3.5" />
              Copy JSON
            </Button>
          </div>
        </div>
        {showJson ? (
          <pre className="max-h-96 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs font-mono leading-relaxed">
            {JSON.stringify(receipt.receipt_json, null, 2)}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground">
            Click <span className="font-medium">Expand</span> to inspect the
            full structured receipt.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <FileText className="size-3" />
            Markdown export
          </p>
          <Button variant="ghost" size="sm" onClick={onCopyMarkdown}>
            <Copy className="size-3.5" />
            Copy Markdown
          </Button>
        </div>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-xs leading-relaxed">
          {receipt.markdown_export}
        </pre>
      </div>
    </div>
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
