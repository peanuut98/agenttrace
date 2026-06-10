"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  FolderKanban,
  Loader2,
  Plus,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/stats-card";
import { ProjectCard } from "@/components/project-card";
import { EmptyState } from "@/components/empty-state";
import { DemoReportButton } from "@/components/demo-report-button";
import { listProjectsBrowser, countRunsBrowser, countReceiptsBrowser } from "@/lib/storage";
import { DEV_MODE, DEV_USER_ID } from "@/lib/dev-mode";
import type { Project } from "@/types/project";

export function DashboardClient() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [runCount, setRunCount] = useState<number | null>(null);
  const [receiptCount, setReceiptCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listProjectsBrowser(),
      countRunsBrowser(),
      countReceiptsBrowser(),
    ])
      .then(([projectList, runs, receipts]) => {
        if (cancelled) return;
        setProjects(projectList);
        setRunCount(runs);
        setReceiptCount(receipts);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load dashboard.",
          );
          setProjects([]);
          setRunCount(0);
          setReceiptCount(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const projectCount = projects?.length ?? 0;
  const isLoading = projects === null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Create, generate, and share Proof-of-Execution reports for Web3 AI
            Agent runs.
          </p>
          {DEV_MODE && (
            <p className="text-xs text-muted-foreground">
              Dev Mode · using local user{" "}
              <span className="font-mono font-medium text-foreground">
                {DEV_USER_ID}
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <DemoReportButton variant="outline" />
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="size-4" />
              Create project
            </Link>
          </Button>
        </div>
      </div>

      <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Demo Mode:</span>{" "}
        Generate Demo Report runs without API keys. Configure an AI provider and
        explorer API keys later to enable live analysis.
      </p>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          label="Projects"
          value={isLoading ? "—" : projectCount.toString()}
          hint={
            isLoading
              ? "Loading…"
              : projectCount === 1
                ? "1 workspace"
                : `${projectCount} workspaces`
          }
          icon={FolderKanban}
        />
        <StatsCard
          label="Agent runs"
          value={runCount === null ? "—" : runCount.toString()}
          hint={
            runCount === null
              ? "Loading…"
              : runCount === 1
                ? "1 traced run"
                : `${runCount} traced runs`
          }
          icon={Activity}
        />
        <StatsCard
          label="Receipts"
          value={receiptCount === null ? "—" : receiptCount.toString()}
          hint={
            receiptCount === null
              ? "Loading…"
              : receiptCount === 1
                ? "1 generated"
                : `${receiptCount} generated`
          }
          icon={Receipt}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Your projects</h2>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading projects…
          </div>
        ) : projectCount === 0 ? (
          <EmptyState
            title="You have no projects yet."
            description="Generate a demo proof-of-execution report to see what AgentTrace produces end to end, or create your first project from scratch."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <DemoReportButton />
                <Button variant="outline" asChild>
                  <Link href="/projects/new">
                    <Plus className="size-4" />
                    Create project
                  </Link>
                </Button>
              </div>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects!.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
