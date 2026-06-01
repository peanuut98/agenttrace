import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  GitBranch,
  Globe,
  Layers,
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
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/types/project";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, user_id, name, description, github_url, demo_url, wallet_address, chain, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle<Project>();

  // RLS already ensures we only see our own rows. If nothing came back,
  // either the project doesn't exist or it isn't ours — both are 404s.
  if (!project) notFound();

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
          <Button disabled title="Coming soon">
            <Plus className="size-4" />
            Create Agent run
          </Button>
        </div>

        <EmptyState
          title="No agent runs yet."
          description="Create your first run to start tracing this project. Run capture is coming in a later day — the button above will be enabled then."
        />
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
