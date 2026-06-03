"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  FlaskConical,
  FolderKanban,
  Loader2,
  Plus,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/stats-card";
import { ProjectCard } from "@/components/project-card";
import { EmptyState } from "@/components/empty-state";
import { listProjectsBrowser } from "@/lib/storage";
import { loadDemoProject } from "@/lib/demo-data";
import { DEV_MODE, DEV_USER_ID } from "@/lib/dev-mode";
import type { Project } from "@/types/project";

export function DashboardClient() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listProjectsBrowser()
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load projects.",
          );
          setProjects([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLoadDemo() {
    setLoadingDemo(true);
    setError(null);
    try {
      const { run } = await loadDemoProject();
      router.push(`/runs/${run.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load demo project.",
      );
      setLoadingDemo(false);
    }
  }

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
            {DEV_MODE ? (
              <>
                Dev Mode is on — using local user{" "}
                <span className="font-mono font-medium text-foreground">
                  {DEV_USER_ID}
                </span>
                .
              </>
            ) : (
              "Signed in. Pick a project to continue."
            )}
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="size-4" />
            Create project
          </Link>
        </Button>
      </div>

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
          value="0"
          hint="Coming soon"
          icon={Activity}
        />
        <StatsCard
          label="Receipts"
          value="0"
          hint="Coming soon"
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
            description="Create your first project to start tracing Web3 agent workflows, or load a demo to see what AgentTrace produces end to end."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link href="/projects/new">
                    <Plus className="size-4" />
                    Create project
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLoadDemo}
                  disabled={loadingDemo}
                >
                  {loadingDemo ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Loading demo…
                    </>
                  ) : (
                    <>
                      <FlaskConical className="size-4" />
                      Load demo project
                    </>
                  )}
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
