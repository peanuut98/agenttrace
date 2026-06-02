import { TraceStep } from "@/components/trace-step";
import type { RunStep } from "@/types/run";

export function TraceTimeline({ steps }: { steps: RunStep[] }) {
  if (steps.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">
        No steps captured for this run.
      </p>
    );
  }

  return (
    <ol className="relative space-y-5 border-l border-border/60 pl-6">
      {steps.map((step) => (
        <TraceStep key={step.id} step={step} />
      ))}
    </ol>
  );
}
