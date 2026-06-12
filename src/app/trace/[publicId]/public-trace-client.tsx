"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Calendar,
  Check,
  ClipboardCheck,
  Copy,
  Database,
  ExternalLink,
  FileCheck,
  Globe,
  Info,
  Key,
  Layers,
  Lightbulb,
  Loader2,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Wallet,
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
import { TraceTimeline } from "@/components/trace-timeline";
import { StatusBadge } from "@/components/status-badge";
import { RiskBadge } from "@/components/risk-badge";
import {
  getPublicRunBrowser,
  getProjectBrowser,
  listStepsForRunBrowser,
  getReceiptForRunBrowser,
} from "@/lib/storage";
import { deriveTrustLevel, type TrustLevel } from "@/lib/trust-level";
import { RegisterProofButton } from "@/components/register-proof-button";
import type { Project } from "@/types/project";
import type { Receipt, RiskFlag, ProofRegistration } from "@/types/receipt";
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
  | { kind: "not-found" }
  | {
      kind: "ready";
      run: Run;
      project: Project;
      steps: RunStep[];
      receipt: Receipt | null;
    };

export function PublicTraceClient({ publicId }: { publicId: string }) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const run = await getPublicRunBrowser(publicId);
        if (cancelled) return;
        if (!run) {
          setState({ kind: "not-found" });
          return;
        }
        const [project, steps, receipt] = await Promise.all([
          getProjectBrowser(run.project_id),
          listStepsForRunBrowser(run.id),
          getReceiptForRunBrowser(run.id),
        ]);
        if (cancelled) return;
        if (!project) {
          setState({ kind: "not-found" });
          return;
        }
        setState({ kind: "ready", run, project, steps, receipt });
      } catch (error) {
        console.error("Failed to load public trace:", error);
        if (!cancelled) setState({ kind: "not-found" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicId]);

  if (state.kind === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading proof-of-execution report…
        </div>
      </div>
    );
  }

  if (state.kind === "not-found") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="size-5 text-destructive" />
              Report Not Found
            </CardTitle>
            <CardDescription>
              This proof-of-execution report does not exist or is no longer
              publicly accessible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Return to AgentTrace
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ReportLayout state={state} />;
}

function ReportLayout({ state }: { state: Extract<LoadState, { kind: "ready" }> }) {
  const { run, project, steps, receipt: initialReceipt } = state;
  const [receipt, setReceipt] = useState(initialReceipt);
  const aiSummary = receipt?.ai_summary ?? null;
  const receiptJson = receipt?.receipt_json;

  const transactionContext = receiptJson?.metadata
    ? ((receiptJson.metadata as unknown) as { transaction_context?: TxContext })
        .transaction_context
    : null;

  const isFromTransaction =
    run.metadata?.generated_from_transaction === true ||
    Boolean(transactionContext);

  const txMeta = isFromTransaction
    ? deriveTxMeta(run, transactionContext)
    : null;

  const auditReadinessScore = aiSummary?.audit_readiness_score ?? null;
  const trust = deriveTrustLevel(run, receipt, transactionContext ?? null);

  const mcpStep = steps.find((s) => s.step_type === "tool_calls");
  const mcpMetadata = mcpStep?.metadata as Record<string, unknown> | null | undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* Header bar */}
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight hover:opacity-80"
          >
            AgentTrace
          </Link>
          <Badge variant="outline" className="gap-1">
            <Globe className="size-3" />
            Public Report
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        {/* Report Header */}
        <ReportHeader
          run={run}
          project={project}
          aiSummary={aiSummary}
          isFromTransaction={isFromTransaction}
        />

        {/* Overview Cards */}
        <OverviewCards
          auditReadinessScore={auditReadinessScore}
          trust={trust}
        />

        {/* Data Source & Trust Level */}
        <DataSourceTrustLevel trust={trust} />

        {/* Mock Mode notice */}
        <ModeNotice trust={trust} />

        {/* How to Read This Report */}
        <HowToReadThisReport />

        {/* Copy Actions */}
        <CopyActions receipt={receipt} />

        {/* 1. Executive Summary */}
        <ReportSection
          icon={<ScrollText className="size-5" />}
          title="Executive Summary"
        >
          <p className="text-sm leading-relaxed">
            {aiSummary?.executive_summary ||
              aiSummary?.run_summary ||
              `This public report records an Agent Run titled "${run.title}" executed by "${run.agent_name}". It includes execution timeline records, project context, and receipt information for review and audit purposes.`}
          </p>
        </ReportSection>

        {/* 2. Project Context */}
        <ReportSection
          icon={<Layers className="size-5" />}
          title="Project Context"
        >
          <ProjectContext project={project} run={run} />
        </ReportSection>

        {/* 3. Transaction Context */}
        <ReportSection
          icon={<Database className="size-5" />}
          title="Transaction Context"
        >
          {txMeta ? (
            <TransactionContextDisplay tx={txMeta} />
          ) : (
            <EmptyMessage text="No transaction context available." />
          )}
        </ReportSection>

        {/* 4. Execution Timeline */}
        <ReportSection
          icon={<ClipboardCheck className="size-5" />}
          title="Execution Timeline"
          description="Eight canonical steps from intent to final result"
        >
          <TraceTimeline steps={steps} />
        </ReportSection>

        {/* 5. MCP / Tool Call Evidence */}
        <ReportSection
          icon={<Sparkles className="size-5" />}
          title="MCP / Tool Call Evidence"
        >
          <MCPEvidence metadata={mcpMetadata} />
        </ReportSection>

        {/* 6. AI Audit Report */}
        <ReportSection
          icon={<ShieldCheck className="size-5" />}
          title="AI Audit Report"
          description="Automated analysis of execution trace and audit readiness"
        >
          {aiSummary ? (
            <AIAuditReportBody summary={aiSummary} />
          ) : (
            <EmptyMessage text="AI Audit Report has not been generated yet." />
          )}
        </ReportSection>

        {/* 7. Evidence Gaps */}
        <ReportSection
          icon={<AlertCircle className="size-5" />}
          title="Evidence Gaps"
          description="These items indicate missing or incomplete evidence that would improve the auditability of this Agent Run."
        >
          <EvidenceGaps summary={aiSummary} />
        </ReportSection>

        {/* 8. Risk Flags */}
        <ReportSection
          icon={<AlertTriangle className="size-5" />}
          title="Risk Flags"
        >
          <RiskFlags summary={aiSummary} />
        </ReportSection>

        {/* 9. Suggested Improvements */}
        <ReportSection
          icon={<Lightbulb className="size-5" />}
          title="Suggested Improvements"
        >
          <SuggestedImprovements summary={aiSummary} />
        </ReportSection>

        {/* 10. Task Receipt */}
        <ReportSection
          icon={<FileCheck className="size-5" />}
          title="Task Receipt"
          description="Cryptographic proof-of-execution with SHA-256 hash"
        >
          {receipt ? (
            <TaskReceiptBody receipt={receipt} />
          ) : (
            <EmptyMessage text="Receipt has not been generated yet." />
          )}
        </ReportSection>

        {/* 11. Markdown Export */}
        <ReportSection
          icon={<ScrollText className="size-5" />}
          title="Markdown Export"
        >
          {receipt?.markdown_export ? (
            <MarkdownExportBody markdown={receipt.markdown_export} />
          ) : (
            <EmptyMessage text="Markdown export has not been generated yet." />
          )}
        </ReportSection>

        {/* 12. On-chain Proof Registration */}
        <ReportSection
          icon={<Wallet className="size-5" />}
          title="On-chain Proof Registration"
          description="Anchor the receipt hash on Base Sepolia via manual wallet confirmation"
        >
          <ProofRegistrationSection
            runId={run.id}
            receipt={receipt}
            publicReportUrl={
              typeof window !== "undefined" && run.public_id
                ? `${window.location.origin}/trace/${run.public_id}`
                : ""
            }
            onRegistered={(reg) =>
              setReceipt((prev) =>
                prev ? { ...prev, proof_registration: reg } : prev,
              )
            }
          />
        </ReportSection>

        {/* Alpha Notice + API Readiness */}
        <AlphaNotice />
        <APIReadiness />

        {/* Footer */}
        <Footer />
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report Header
// ---------------------------------------------------------------------------
function ReportHeader({
  run,
  project,
  aiSummary,
  isFromTransaction,
}: {
  run: Run;
  project: Project;
  aiSummary: Receipt["ai_summary"];
  isFromTransaction: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          AgentTrace Proof-of-Execution Report
        </h1>
        <p className="text-base text-muted-foreground">
          This report records a Web3 AI Agent run with transaction context,
          execution timeline, AI audit analysis, evidence gaps, and a verifiable
          receipt hash.
        </p>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold">{run.title}</h2>
            <p className="text-sm text-muted-foreground">
              Agent: {run.agent_name}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="size-3" />
              Generated by AgentTrace
            </Badge>
            {(aiSummary?.source === "ai" ||
              aiSummary?.source === "z_ai" ||
              aiSummary?.source === "claude_compatible") && (
              <Badge variant="default" className="gap-1">
                {aiSummary.source === "z_ai"
                  ? "Generated by GLM-5.1"
                  : aiSummary.source === "claude_compatible"
                    ? "Generated by Claude-compatible API"
                    : "Generated by AI Provider"}
              </Badge>
            )}
            {aiSummary?.source === "mock" && (
              <Badge variant="outline" className="gap-1">
                Mock AI Report
              </Badge>
            )}
            {isFromTransaction && (
              <Badge variant="secondary" className="gap-1">
                Generated from Transaction
              </Badge>
            )}
            {project.chain && (
              <Badge variant="outline">{project.chain}</Badge>
            )}
            <StatusBadge status={run.status} />
            <RiskBadge risk={run.risk_level} />
          </div>

          {run.published_at && (
            <p className="text-xs text-muted-foreground">
              Published {dateFormatter.format(new Date(run.published_at))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview Cards
// ---------------------------------------------------------------------------
function OverviewCards({
  auditReadinessScore,
  trust,
}: {
  auditReadinessScore: number | null;
  trust: TrustLevel;
}) {
  const verificationTone =
    trust.verificationLevel === "Explorer Verified"
      ? "good"
      : trust.verificationLevel === "Basic Verified"
        ? "neutral"
        : "warn";

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <OverviewCard
        icon={<Award className="size-4" />}
        label="Audit Readiness"
        value={
          auditReadinessScore !== null ? (
            <ScoreDisplay score={auditReadinessScore} />
          ) : (
            <span className="text-muted-foreground">Not generated</span>
          )
        }
      />
      <OverviewCard
        icon={<Database className="size-4" />}
        label="Data Source"
        value={
          <span className="text-base font-semibold">
            {trust.transactionDataSource}
          </span>
        }
        sublabel={
          trust.transactionDataSource === "Mock Fallback"
            ? "Demo Mode"
            : trust.transactionDataSource === "Explorer API"
              ? "Live"
              : trust.transactionDataSource === "Manual Input"
                ? "Self-reported"
                : undefined
        }
      />
      <OverviewCard
        icon={<Sparkles className="size-4" />}
        label="AI Source"
        value={
          <span className="text-base font-semibold">
            {trust.aiReportSource}
          </span>
        }
        sublabel={
          trust.aiReportSource === "Generated by GLM-5.1" ||
          trust.aiReportSource === "Generated by AI Provider" ||
          trust.aiReportSource === "Generated by Claude-compatible API"
            ? "Live"
            : trust.aiReportSource === "Mock AI Report"
              ? "Demo Mode"
              : "Pending"
        }
      />
      <OverviewCard
        icon={<ShieldCheck className="size-4" />}
        label="Verification"
        value={
          <span
            className={`text-base font-semibold ${
              verificationTone === "good"
                ? "text-green-600"
                : verificationTone === "warn"
                  ? "text-amber-600"
                  : "text-foreground"
            }`}
          >
            {trust.verificationLevel}
          </span>
        }
      />
    </div>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sublabel?: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
        <div>{value}</div>
        {sublabel && (
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {sublabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreDisplay({ score }: { score: number }) {
  const tone = score >= 80 ? "text-green-600" : score >= 60 ? "text-amber-600" : "text-red-600";
  return (
    <div className="space-y-1.5">
      <div className={`text-2xl font-bold ${tone}`}>
        {score} <span className="text-sm font-normal text-muted-foreground">/ 100</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${
            score >= 80 ? "bg-green-600" : score >= 60 ? "bg-amber-500" : "bg-red-600"
          }`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Copy Actions
// ---------------------------------------------------------------------------
function CopyActions({ receipt }: { receipt: Receipt | null }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copy(label: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(label);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  }

  const publicUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => copy("link", publicUrl)}
      >
        {copiedKey === "link" ? (
          <Check className="size-4 text-green-600" />
        ) : (
          <Copy className="size-4" />
        )}
        Copy Public Link
      </Button>
      {receipt?.markdown_export && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => copy("markdown", receipt.markdown_export)}
        >
          {copiedKey === "markdown" ? (
            <Check className="size-4 text-green-600" />
          ) : (
            <Copy className="size-4" />
          )}
          Copy Markdown
        </Button>
      )}
      {receipt?.receipt_hash && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => copy("hash", receipt.receipt_hash)}
        >
          {copiedKey === "hash" ? (
            <Check className="size-4 text-green-600" />
          ) : (
            <Copy className="size-4" />
          )}
          Copy Receipt Hash
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report Section wrapper
// ---------------------------------------------------------------------------
function ReportSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed bg-muted/20 px-4 py-6 text-center text-sm italic text-muted-foreground">
      {text}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project Context
// ---------------------------------------------------------------------------
function ProjectContext({ project, run }: { project: Project; run: Run }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <InfoRow icon={<Layers className="size-4" />} label="Project Name">
        <span className="font-medium">{project.name}</span>
      </InfoRow>
      <InfoRow icon={<Calendar className="size-4" />} label="Created">
        <span className="text-sm">
          {dateFormatter.format(new Date(run.created_at))}
        </span>
      </InfoRow>
      {project.description && (
        <div className="sm:col-span-2">
          <InfoRow icon={<ScrollText className="size-4" />} label="Description">
            <span className="text-sm leading-relaxed">{project.description}</span>
          </InfoRow>
        </div>
      )}
      {project.chain && (
        <InfoRow icon={<Layers className="size-4" />} label="Chain">
          <Badge variant="secondary">{project.chain}</Badge>
        </InfoRow>
      )}
      {project.wallet_address && (
        <InfoRow icon={<Wallet className="size-4" />} label="Wallet">
          <span className="font-mono text-xs">
            {truncateAddress(project.wallet_address)}
          </span>
        </InfoRow>
      )}
      {project.github_url && (
        <InfoRow icon={<ExternalLink className="size-4" />} label="GitHub">
          <ExternalLinkText href={project.github_url} label="View Repository" />
        </InfoRow>
      )}
      {project.demo_url && (
        <InfoRow icon={<ExternalLink className="size-4" />} label="Demo">
          <ExternalLinkText href={project.demo_url} label="View Demo" />
        </InfoRow>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transaction Context Display
// ---------------------------------------------------------------------------
type TxContext = {
  chain?: string;
  tx_hash?: string;
  transaction_hash?: string;
  status?: string;
  from?: string;
  to?: string | null;
  value?: string;
  gas_used?: string;
  block_number?: string;
  timestamp?: string;
  method?: string;
  explorer_url?: string;
  is_mock?: boolean;
  analysis_source?: string;
};

function TransactionContextDisplay({ tx }: { tx: TxContext }) {
  const txHash = tx.tx_hash ?? tx.transaction_hash ?? "";
  const explorerUrl =
    tx.explorer_url ??
    (txHash ? getExplorerUrl(tx.chain ?? "Base Sepolia", txHash) : "");
  const isMock =
    tx.is_mock === true || tx.analysis_source === "mock";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {isMock ? (
          <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
            Mock transaction data
          </Badge>
        ) : (
          <Badge variant="default" className="gap-1">
            Explorer API
          </Badge>
        )}
        {tx.status && (
          <Badge
            variant={tx.status === "success" ? "default" : "outline"}
            className={
              tx.status === "success" ? "" : "border-amber-500 text-amber-600"
            }
          >
            {tx.status}
          </Badge>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {tx.chain && (
          <InfoRow icon={<Layers className="size-4" />} label="Chain">
            <span className="text-sm font-medium">{tx.chain}</span>
          </InfoRow>
        )}
        {txHash && (
          <InfoRow
            icon={<ExternalLink className="size-4" />}
            label="Tx Hash"
          >
            <span className="font-mono text-xs">{truncateHash(txHash)}</span>
          </InfoRow>
        )}
        {tx.from && (
          <InfoRow icon={<Wallet className="size-4" />} label="From">
            <span className="font-mono text-xs">{truncateAddress(tx.from)}</span>
          </InfoRow>
        )}
        {tx.to && (
          <InfoRow icon={<Wallet className="size-4" />} label="To">
            <span className="font-mono text-xs">{truncateAddress(tx.to)}</span>
          </InfoRow>
        )}
        {tx.value && (
          <InfoRow icon={<Database className="size-4" />} label="Value">
            <span className="text-sm font-medium">{tx.value}</span>
          </InfoRow>
        )}
        {tx.gas_used && (
          <InfoRow icon={<Database className="size-4" />} label="Gas Used">
            <span className="font-mono text-xs">{tx.gas_used}</span>
          </InfoRow>
        )}
        {tx.block_number && (
          <InfoRow icon={<Database className="size-4" />} label="Block">
            <span className="font-mono text-xs">{tx.block_number}</span>
          </InfoRow>
        )}
        {tx.timestamp && (
          <InfoRow icon={<Calendar className="size-4" />} label="Timestamp">
            <span className="text-xs">
              {dateFormatter.format(new Date(tx.timestamp))}
            </span>
          </InfoRow>
        )}
        {tx.method && (
          <InfoRow icon={<Sparkles className="size-4" />} label="Method">
            <span className="font-mono text-xs">{tx.method}</span>
          </InfoRow>
        )}
      </div>

      {explorerUrl && (
        <Button asChild variant="outline" size="sm">
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
            View on Explorer
          </a>
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MCP Evidence
// ---------------------------------------------------------------------------
function MCPEvidence({
  metadata,
}: {
  metadata: Record<string, unknown> | null | undefined;
}) {
  if (!metadata) {
    return <EmptyMessage text="No structured MCP metadata was recorded." />;
  }

  const fields: Array<[string, unknown]> = [
    ["MCP Server", metadata.mcp_server],
    ["Tool Name", metadata.tool_name],
    ["Input Summary", metadata.tool_input_summary],
    ["Output Summary", metadata.tool_output_summary],
    [
      "Latency",
      typeof metadata.latency_ms === "number"
        ? `${metadata.latency_ms} ms`
        : null,
    ],
  ];

  const present = fields.filter(
    ([, val]) => val !== null && val !== undefined && val !== "",
  );

  if (present.length === 0) {
    return <EmptyMessage text="No structured MCP metadata was recorded." />;
  }

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {present.map(([label, val]) => (
        <div
          key={label}
          className="space-y-1 rounded-md border bg-muted/20 px-3 py-2"
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </dt>
          <dd className="font-mono text-sm">{String(val)}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------------------
// AI Audit Report Body
// ---------------------------------------------------------------------------

const FALLBACK_REASON_GUIDANCE: Record<string, string> = {
  missing_api_key:
    "API key is not configured for the selected provider. Set ZAI_API_KEY in .env.local and restart the dev server.",
  missing_base_url:
    "Base URL is not configured. Check ZAI_API_BASE in .env.local.",
  missing_model:
    "Model name is empty. Set ZAI_MODEL=glm-5.1 in .env.local.",
  unauthorized:
    "Provider returned 401/403. The API key is invalid or has been revoked. Verify the key in your Z.ai dashboard.",
  insufficient_balance:
    "Provider returned an insufficient-balance error. Top up the account in your Z.ai dashboard.",
  model_not_found:
    "Provider could not locate the requested model. Check ZAI_MODEL — Z.ai recommends 'glm-5.1'.",
  invalid_request:
    "Provider returned 400/422. The request payload was rejected. Check the dev-server log for the raw response.",
  invalid_response_format:
    "Provider returned 200 but the body did not match the OpenAI-compatible chat completions shape.",
  json_parse_error:
    "The model returned text that did not contain a valid JSON object. Try a different model or strengthen the system prompt.",
  network_error:
    "fetch threw before getting a response. Check network connectivity, proxy, or DNS.",
  unknown_error:
    "Provider returned a non-success status not covered by the structured codes. See dev-server log for details.",
};

function FallbackDiagnostic({
  reason,
  detail,
  attemptedProvider,
  attemptedModel,
}: {
  reason: string;
  detail?: string;
  attemptedProvider?: string;
  attemptedModel?: string;
}) {
  const guidance = FALLBACK_REASON_GUIDANCE[reason];
  return (
    <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">Fallback reason:</span>
        <code className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono">
          {reason}
        </code>
        {attemptedProvider && (
          <span>
            Attempted provider:{" "}
            <code className="font-mono">{attemptedProvider}</code>
          </span>
        )}
        {attemptedModel && (
          <span>
            Attempted model: <code className="font-mono">{attemptedModel}</code>
          </span>
        )}
      </div>
      {guidance && <p className="leading-relaxed">{guidance}</p>}
      {detail && (
        <p className="break-words font-mono text-[11px] opacity-80">{detail}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Original AI Audit Report Body marker (kept for clarity)
// ---------------------------------------------------------------------------
function AIAuditReportBody({
  summary,
}: {
  summary: NonNullable<Receipt["ai_summary"]>;
}) {
  const isLive =
    summary.source === "ai" ||
    summary.source === "z_ai" ||
    summary.source === "claude_compatible";

  const badgeText =
    summary.source === "z_ai"
      ? "Generated by GLM-5.1"
      : summary.source === "claude_compatible"
        ? "Generated by Claude-compatible API"
        : summary.source === "ai"
          ? "Generated by AI Provider"
          : "Mock Report";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={isLive ? "default" : "outline"}>{badgeText}</Badge>
        {summary.model && (
          <span className="rounded-md border bg-muted/30 px-2 py-0.5 font-mono text-xs text-muted-foreground">
            model: {summary.model}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          Generated {dateFormatter.format(new Date(summary.generated_at))}
        </span>
      </div>

      {summary.fallback_reason && (
        <FallbackDiagnostic
          reason={summary.fallback_reason}
          detail={summary.fallback_detail}
          attemptedProvider={summary.attempted_provider}
          attemptedModel={summary.attempted_model}
        />
      )}

      {summary.executive_summary && (
        <SubSection title="Executive Summary">
          <p className="text-sm leading-relaxed">{summary.executive_summary}</p>
        </SubSection>
      )}

      <SubSection title="Technical Flow">
        <p className="text-sm leading-relaxed">{summary.technical_flow}</p>
      </SubSection>

      <SubSection title="Audit Notes">
        <p className="text-sm leading-relaxed">{summary.audit_notes}</p>
      </SubSection>

      {typeof summary.audit_readiness_score === "number" && (
        <SubSection title="Audit Readiness Score">
          <ScoreDisplay score={summary.audit_readiness_score} />
        </SubSection>
      )}
    </div>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evidence Gaps
// ---------------------------------------------------------------------------
function EvidenceGaps({
  summary,
}: {
  summary: Receipt["ai_summary"];
}) {
  if (!summary) {
    return <EmptyMessage text="Evidence gaps have not been analyzed yet." />;
  }
  const gaps = summary.missing_evidence ?? [];
  if (gaps.length === 0) {
    return <EmptyMessage text="No evidence gaps were reported." />;
  }
  return (
    <ul className="space-y-2">
      {gaps.map((gap, idx) => (
        <li key={idx} className="flex items-start gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>{gap}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Risk Flags
// ---------------------------------------------------------------------------
function RiskFlags({ summary }: { summary: Receipt["ai_summary"] }) {
  if (!summary) {
    return <EmptyMessage text="No risk flags were reported." />;
  }
  const flags = summary.risk_flags ?? [];
  if (flags.length === 0) {
    return <EmptyMessage text="No risk flags were reported." />;
  }
  return (
    <ul className="space-y-2">
      {flags.map((flag: RiskFlag, idx: number) => (
        <li
          key={idx}
          className="flex items-start gap-3 rounded-md border bg-muted/20 px-3 py-2 text-sm"
        >
          <RiskLevelBadge level={flag.level} />
          <span className="flex-1">{flag.item}</span>
        </li>
      ))}
    </ul>
  );
}

function RiskLevelBadge({ level }: { level: RiskFlag["level"] }) {
  const styles: Record<RiskFlag["level"], string> = {
    low: "border-blue-500 text-blue-600",
    medium: "border-amber-500 text-amber-600",
    high: "border-red-500 text-red-600",
  };
  return (
    <Badge variant="outline" className={`${styles[level]} shrink-0 uppercase`}>
      {level}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Suggested Improvements
// ---------------------------------------------------------------------------
function SuggestedImprovements({
  summary,
}: {
  summary: Receipt["ai_summary"];
}) {
  if (!summary) {
    return (
      <EmptyMessage text="No suggested improvements were generated." />
    );
  }
  const items = summary.suggested_improvements ?? [];
  if (items.length === 0) {
    return (
      <EmptyMessage text="No suggested improvements were generated." />
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item, idx) => (
        <li
          key={idx}
          className="flex items-start gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm"
        >
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Task Receipt
// ---------------------------------------------------------------------------
function TaskReceiptBody({ receipt }: { receipt: Receipt }) {
  const [copiedJson, setCopiedJson] = useState(false);

  function copyJson() {
    navigator.clipboard
      .writeText(JSON.stringify(receipt.receipt_json, null, 2))
      .then(() => {
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2000);
      });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoRow icon={<FileCheck className="size-4" />} label="Receipt Hash">
          <span className="break-all font-mono text-xs">
            {receipt.receipt_hash}
          </span>
        </InfoRow>
        <InfoRow icon={<Calendar className="size-4" />} label="Generated At">
          <span className="text-sm">
            {dateFormatter.format(
              new Date(receipt.receipt_json.metadata.generated_at),
            )}
          </span>
        </InfoRow>
      </div>

      <details className="group rounded-md border bg-muted/20">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
          View JSON Receipt
        </summary>
        <div className="border-t p-3">
          <Button
            variant="outline"
            size="sm"
            onClick={copyJson}
            className="mb-2"
          >
            {copiedJson ? (
              <Check className="size-4 text-green-600" />
            ) : (
              <Copy className="size-4" />
            )}
            Copy JSON
          </Button>
          <pre className="max-h-96 overflow-auto rounded-md bg-background p-3 text-xs">
            {JSON.stringify(receipt.receipt_json, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Markdown Export
// ---------------------------------------------------------------------------
function MarkdownExportBody({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-3">
      <Button variant="outline" size="sm" onClick={copy}>
        {copied ? (
          <Check className="size-4 text-green-600" />
        ) : (
          <Copy className="size-4" />
        )}
        Copy Markdown
      </Button>
      <pre className="max-h-96 overflow-auto rounded-md border bg-muted/20 p-3 text-xs">
        {markdown}
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data Source & Trust Level
// ---------------------------------------------------------------------------
function DataSourceTrustLevel({ trust }: { trust: TrustLevel }) {
  const rows: Array<{ label: string; value: string; tone: "good" | "warn" | "neutral" }> = [
    {
      label: "Transaction Data Source",
      value: trust.transactionDataSource,
      tone:
        trust.transactionDataSource === "Explorer API"
          ? "good"
          : trust.transactionDataSource === "Mock Fallback"
            ? "warn"
            : "neutral",
    },
    {
      label: "AI Report Source",
      value: trust.aiReportSource,
      tone:
        trust.aiReportSource === "Generated by GLM-5.1" ||
        trust.aiReportSource === "Generated by AI Provider" ||
        trust.aiReportSource === "Generated by Claude-compatible API"
          ? "good"
          : trust.aiReportSource === "Mock AI Report"
            ? "warn"
            : "neutral",
    },
    {
      label: "Verification Level",
      value: trust.verificationLevel,
      tone:
        trust.verificationLevel === "Explorer Verified"
          ? "good"
          : trust.verificationLevel === "Demo Mode"
            ? "warn"
            : "neutral",
    },
    {
      label: "Receipt Source",
      value: trust.receiptSource,
      tone: trust.receiptSource === "Generated by AgentTrace" ? "good" : "warn",
    },
    {
      label: "Report Mode",
      value: trust.reportMode,
      tone:
        trust.reportMode === "Live Mode"
          ? "good"
          : trust.reportMode === "Demo Mode"
            ? "warn"
            : "neutral",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="size-5" />
          Data Source & Trust Level
        </CardTitle>
        <CardDescription>
          Transparent labeling of every data source used in this report.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ label, value, tone }) => (
            <div
              key={label}
              className="space-y-1 rounded-md border bg-muted/20 px-3 py-2"
            >
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </dt>
              <dd
                className={`text-sm font-semibold ${
                  tone === "good"
                    ? "text-green-600"
                    : tone === "warn"
                      ? "text-amber-600"
                      : "text-foreground"
                }`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Mode Notice (Demo / Mock Transaction / Mock AI)
// ---------------------------------------------------------------------------
function ModeNotice({ trust }: { trust: TrustLevel }) {
  // Both mock → unified Demo Mode notice
  if (trust.isTxMock && trust.isAiMock) {
    return (
      <NoticeCard
        tone="warn"
        title="Demo Mode"
        description="This report is running in Demo Mode. It shows the complete AgentTrace workflow without requiring API keys. Configure an AI provider and explorer API credentials to enable live transaction verification and live AI audit reports."
      />
    );
  }
  if (trust.isTxMock) {
    return (
      <NoticeCard
        tone="warn"
        title="Mock Transaction Data"
        description="This report uses mock transaction data because an explorer API key is not configured. It demonstrates the AgentTrace proof-of-execution workflow, but should not be treated as full on-chain verification."
      />
    );
  }
  if (trust.isAiMock) {
    return (
      <NoticeCard
        tone="warn"
        title="Mock AI Audit Report"
        description="This audit report was generated using local mock logic because no AI provider call succeeded. The recommended primary provider is Z.ai GLM-5.1 (set AI_PROVIDER=z_ai and ZAI_API_KEY). Claude-compatible APIs are also supported as a fallback."
      />
    );
  }
  return null;
}

function NoticeCard({
  tone,
  title,
  description,
}: {
  tone: "warn" | "info";
  title: string;
  description: string;
}) {
  const toneClass =
    tone === "warn"
      ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
      : "border-sky-300 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40";
  const iconClass = tone === "warn" ? "text-amber-600" : "text-sky-600";
  const Icon = tone === "warn" ? AlertCircle : Info;
  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 size-5 shrink-0 ${iconClass}`} />
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// How to Read This Report
// ---------------------------------------------------------------------------
function HowToReadThisReport() {
  const items = [
    "Executive Summary explains what this Agent Run is about.",
    "Transaction Context shows available on-chain or demo evidence.",
    "Execution Timeline reconstructs the agent workflow step by step.",
    "AI Audit Report identifies evidence gaps, risk flags, and suggested improvements.",
    "Receipt Hash provides a stable reference for this report.",
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Info className="size-5" />
          How to Read This Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2 text-sm">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3 rounded-md border bg-muted/20 px-3 py-2"
            >
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">
                {idx + 1}
              </span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Alpha Notice
// ---------------------------------------------------------------------------
function AlphaNotice() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Info className="size-5" />
          Alpha Notice
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground">
          AgentTrace Alpha currently supports manual and transaction-based
          proof-of-execution generation with mock fallback support. Live
          explorer data and AI audit reports can be enabled by configuring API
          keys. Full MCP SDK logging, wallet approval tracking,
          payment tracing, on-chain receipt anchoring, and production database
          support are planned.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// API Readiness
// ---------------------------------------------------------------------------
function APIReadiness() {
  const rows: Array<{ key: string; description: string }> = [
    { key: "AI_PROVIDER", description: "Selects the AI provider (z_ai, claude_compatible, or mock)" },
    { key: "ZAI_API_KEY", description: "Enables live Z.ai GLM-5.1 audit reports (recommended primary)" },
    { key: "ZAI_MODEL", description: "Selects the Z.ai model (default: glm-5.1)" },
    { key: "ZAI_API_BASE", description: "Configures the Z.ai endpoint" },
    { key: "CLAUDE_COMPATIBLE_API_KEY", description: "Optional fallback: live Claude-compatible audit reports" },
    { key: "CLAUDE_COMPATIBLE_MODEL", description: "Selects the Claude-compatible model" },
    { key: "CLAUDE_COMPATIBLE_API_BASE", description: "Configures the Claude-compatible endpoint" },
    {
      key: "BASESCAN_API_KEY",
      description: "Enables real Base / Base Sepolia transaction context",
    },
    {
      key: "ETHERSCAN_API_KEY",
      description: "Enables Ethereum / Sepolia transaction context",
    },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Key className="size-5" />
          API Readiness
        </CardTitle>
        <CardDescription>
          Configure these environment variables to enable live data sources.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2">
          {rows.map(({ key, description }) => (
            <div
              key={key}
              className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/20 px-3 py-2"
            >
              <dt className="font-mono text-xs font-semibold">{key}</dt>
              <dd className="flex-1 text-xs text-muted-foreground">
                {description}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
function Footer() {
  return (
    <div className="border-t pt-8 text-center text-sm text-muted-foreground">
      <p>
        This proof-of-execution report was generated by{" "}
        <Link
          href="/"
          className="font-medium text-foreground underline underline-offset-4"
        >
          AgentTrace
        </Link>
        .
      </p>
      <p className="mt-1 text-xs">
        AgentTrace turns Web3 AI Agent runs into shareable Proof-of-Execution
        reports.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers and shared atoms
// ---------------------------------------------------------------------------
function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

function ExternalLinkText({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4 hover:text-primary/80"
    >
      {label}
      <ExternalLink className="size-3" />
    </a>
  );
}

// ---------------------------------------------------------------------------
// On-chain Proof Registration section
// ---------------------------------------------------------------------------
function ProofRegistrationSection({
  runId,
  receipt,
  publicReportUrl,
  onRegistered,
}: {
  runId: string;
  receipt: Receipt | null;
  publicReportUrl: string;
  onRegistered: (reg: ProofRegistration) => void;
}) {
  if (!receipt) {
    return (
      <EmptyMessage text="Generate the Task Receipt first to derive a receipt hash, then anchor it on-chain." />
    );
  }
  if (!receipt.receipt_hash) {
    return <EmptyMessage text="This receipt has no hash to register." />;
  }
  return (
    <RegisterProofButton
      runId={runId}
      receiptHash={receipt.receipt_hash}
      publicReportUrl={publicReportUrl}
      existing={receipt.proof_registration ?? null}
      onRegistered={onRegistered}
    />
  );
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

function truncateHash(hash: string): string {
  if (!hash || hash.length < 18) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function getExplorerUrl(chain: string, txHash: string): string {
  const baseUrls: Record<string, string> = {
    "Base Sepolia": "https://sepolia.basescan.org",
    "Ethereum Sepolia": "https://sepolia.etherscan.io",
  };
  const baseUrl = baseUrls[chain] ?? "https://sepolia.basescan.org";
  return `${baseUrl}/tx/${txHash}`;
}

function deriveTxMeta(run: Run, txContext: TxContext | null | undefined): TxContext | null {
  if (txContext) return txContext;
  const txHash = run.metadata?.transaction_hash as string | undefined;
  const chain = run.metadata?.transaction_chain as string | undefined;
  if (!txHash) return null;
  return {
    chain: chain ?? "Base Sepolia",
    tx_hash: txHash,
    transaction_hash: txHash,
    is_mock: run.metadata?.analysis_source === "mock",
    analysis_source: run.metadata?.analysis_source as string,
  };
}
