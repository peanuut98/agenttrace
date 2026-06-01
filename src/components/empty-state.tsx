import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed bg-muted/20", className)}>
      <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <p className="text-sm font-medium">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
