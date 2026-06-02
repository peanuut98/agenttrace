import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CircleDashed,
  Brain,
  FileCheck,
  Wrench,
  Coins,
  Wallet,
  Link2,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RunStep, StepStatus, StepType } from "@/types/run";

const STEP_ICONS: Record<StepType, LucideIcon> = {
  user_intent: Brain,
  agent_plan: FileCheck,
  tool_calls: Wrench,
  payment_request: Coins,
  wallet_approval: Wallet,
  onchain_transaction: Link2,
  verification: ShieldCheck,
  final_result: Sparkles,
};

const STATUS_STYLE: Record<
  StepStatus,
  { label: string; badge: string; ring: string; Icon: LucideIcon }
> = {
  success: {
    label: "success",
    badge:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    ring: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    Icon: CheckCircle2,
  },
  warning: {
    label: "warning",
    badge:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    ring: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    Icon: AlertTriangle,
  },
  failed: {
    label: "failed",
    badge: "border-destructive/40 bg-destructive/10 text-destructive",
    ring: "bg-destructive/15 text-destructive",
    Icon: XCircle,
  },
  skipped: {
    label: "skipped",
    badge: "border-border bg-muted text-muted-foreground",
    ring: "bg-muted text-muted-foreground",
    Icon: CircleDashed,
  },
};

export function TraceStep({ step }: { step: RunStep }) {
  const Icon = STEP_ICONS[step.step_type] ?? Brain;
  const status = STATUS_STYLE[step.status];

  return (
    <li className="relative">
      <span
        className={cn(
          "absolute -left-[34px] flex size-7 items-center justify-center rounded-full ring-4 ring-background",
          status.ring,
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{step.title}</p>
        <Badge variant="outline" className={cn("gap-1", status.badge)}>
          <status.Icon className="size-3" />
          {status.label}
        </Badge>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          #{step.order_index + 1}
        </span>
      </div>
      {step.content ? (
        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
          {step.content}
        </p>
      ) : (
        <p className="mt-1 text-sm italic text-muted-foreground/70">
          No content captured.
        </p>
      )}
    </li>
  );
}
