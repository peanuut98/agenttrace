import { CheckCircle2, AlertTriangle, XCircle, FileEdit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RunStatus } from "@/types/run";

const STYLES: Record<
  RunStatus,
  { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  success: {
    label: "Success",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    Icon: CheckCircle2,
  },
  warning: {
    label: "Warning",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    Icon: AlertTriangle,
  },
  failed: {
    label: "Failed",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
    Icon: XCircle,
  },
  draft: {
    label: "Draft",
    className: "border-border bg-muted text-muted-foreground",
    Icon: FileEdit,
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: RunStatus;
  className?: string;
}) {
  const style = STYLES[status];
  const Icon = style.Icon;
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", style.className, className)}>
      <Icon className="size-3" />
      {style.label}
    </Badge>
  );
}
