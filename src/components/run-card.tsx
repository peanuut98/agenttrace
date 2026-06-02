import Link from "next/link";
import { ArrowUpRight, Bot } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { RiskBadge } from "@/components/risk-badge";
import type { Run } from "@/types/run";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function RunCard({ run }: { run: Run }) {
  return (
    <Link
      href={`/runs/${run.id}`}
      className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="h-full transition-colors group-hover:border-foreground/20">
        <CardHeader className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base font-semibold tracking-tight">
              {run.title}
            </CardTitle>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          <CardDescription className="inline-flex items-center gap-1.5">
            <Bot className="size-3.5" />
            {run.agent_name}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status={run.status} />
            <RiskBadge risk={run.risk_level} />
          </div>
          <span className="font-mono">
            {dateFormatter.format(new Date(run.created_at))}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
