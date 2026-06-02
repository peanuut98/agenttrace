"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  GitBranch,
  Globe,
  Layers,
  Loader2,
  Plus,
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
import { EmptyState } from "@/components/empty-state";
import { RunCard } from "@/components/run-card";
import {
  getProjectBrowser,
  listRunsForProjectBrowser,
} from "@/lib/storage";
import type { Project } from "@/types/project";
import type { Run } from "@/types/run";

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
  | { kind: "ready"; project: Project; runs: Run[] };

export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const project = await getProjectBrowser(projectId);
        if (cancelled) return;
        if (!project) {
          setState({ kind: "missing" });
          return;
        }
        const runs = await listRunsForProjectBrowser(projectId);
        if (cancelled) return;
        setState({ kind: "ready", project, runs });
      } catch {
        if (!cancelled) setState({ kind: "missing" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (state.kind === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-4xl items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading project…
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
          title="Project not found."
          description="It may have been deleted, or it doesn't belong to this account."
        />
      </div>
    );
  }

  const { project, runs } = state;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/dashboard">
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-2xl tracking-tight">
                {project.name}
              </CardTitle>
              {project.description ? (
                <CardDescription>{project.description}</CardDescription>
              ) : (
                <CardDescription className="italic">
                  No description
                </CardDescription>
              )}
            </div>
            {project.chain ? (
              <Badge variant="secondary" className="gap-1 font-medium">
                <Layers className="size-3" />
                {project.chain}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <DetailRow
            icon={<GitBranch className="size-4" />}
            label="GitHub"
            value={
              project.github_url ? (
                <ExternalAnchor href={project.github_url} />
              ) : null
            }
          />
          <DetailRow
            icon={<Globe className="size-4" />}
            label="Demo"
            value={
              project.demo_url ? (
                <ExternalAnchor href={project.demo_url} />
              ) : null
            }
          />
          <DetailRow
            icon={<Wallet className="size-4" />}
            label="Wallet"
            value={
              project.wallet_address ? (
                <span className="font-mono break-all">
                  {project.wallet_address}
                </span>
              ) : null
            }
          />
          <DetailRow
            icon={<Calendar className="size-4" />}
            label="Created"
            value={
              <span className="font-mono">
                {dateFormatter.format(new Date(project.created_at))}
              </span>
            }
          />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Agent runs</h2>
            <p className="text-sm text-muted-foreground">
              Each run captures intent, plan, tool calls, wallet confirmation
              and on-chain results.
            </p>
          </div>
          <Button asChild>
            <Link href={`/projects/${project.id}/runs/new`}>
              <Plus className="size-4" />
              Create Agent run
            </Link>
          </Button>
        </div>

        {runs.length === 0 ? (
          <EmptyState
            title="No agent runs yet."
            description="Create your first run to start tracing this project."
            action={
              <Button asChild>
                <Link href={`/projects/${project.id}/runs/new`}>
                  <Plus className="size-4" />
                  Create Agent run
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {runs.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
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
        <div className="text-sm">
          {value ?? (
            <span className="italic text-muted-foreground/70">Not set</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ExternalAnchor({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-1 truncate font-medium underline underline-offset-4 hover:text-foreground"
    >
      <span className="truncate">{href}</span>
      <ExternalLink className="size-3 shrink-0" />
    </a>
  );
}
