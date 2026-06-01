import Link from "next/link";
import { ArrowUpRight, GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Project } from "@/types/project";

type ProjectCardProps = {
  project: Project;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="h-full transition-colors group-hover:border-foreground/20">
        <CardHeader className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base font-semibold tracking-tight">
              {project.name}
            </CardTitle>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          {project.description ? (
            <CardDescription className="line-clamp-2">
              {project.description}
            </CardDescription>
          ) : (
            <CardDescription className="italic text-muted-foreground/70">
              No description
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            {project.chain ? (
              <Badge variant="secondary" className="font-medium">
                {project.chain}
              </Badge>
            ) : null}
            {project.github_url ? (
              <span className="inline-flex items-center gap-1">
                <GitBranch className="size-3" />
                GitHub
              </span>
            ) : null}
          </div>
          <span className="font-mono">
            {dateFormatter.format(new Date(project.created_at))}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
