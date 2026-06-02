import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types/run";

const STYLES: Record<
  RiskLevel,
  { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  low: {
    label: "Low risk",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    Icon: ShieldCheck,
  },
  medium: {
    label: "Medium risk",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    Icon: ShieldAlert,
  },
  high: {
    label: "High risk",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
    Icon: ShieldX,
  },
};

export function RiskBadge({
  risk,
  className,
}: {
  risk: RiskLevel;
  className?: string;
}) {
  const style = STYLES[risk];
  const Icon = style.Icon;
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", style.className, className)}>
      <Icon className="size-3" />
      {style.label}
    </Badge>
  );
}
