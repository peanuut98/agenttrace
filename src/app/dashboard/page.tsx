import Link from "next/link";
import { Activity, FolderKanban, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/stats-card";
import { ProjectCard } from "@/components/project-card";
import { EmptyState } from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/types/project";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already redirects unauthenticated users, but the type guard
  // keeps the rest of the component honest.
  if (!user) return null;

  const { data: projects, error } = await supabase
    .from("projects")
    .select(
      "id, user_id, name, description, github_url, demo_url, wallet_address, chain, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  const projectList: Project[] = projects ?? [];
  const projectCount = projectList.length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">{user.email}</span>
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
          value={projectCount.toString()}
          hint={projectCount === 1 ? "1 workspace" : `${projectCount} workspaces`}
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Your projects
          </h2>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            Failed to load projects: {error.message}
          </p>
        ) : projectCount === 0 ? (
          <EmptyState
            title="You have no projects yet."
            description="Create your first project to start tracing Web3 agent workflows."
            action={
              <Button asChild>
                <Link href="/projects/new">
                  <Plus className="size-4" />
                  Create project
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projectList.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
