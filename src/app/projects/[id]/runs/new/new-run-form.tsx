"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createRunWithStepsBrowser } from "@/lib/storage";
import {
  RISK_LEVEL_OPTIONS,
  RUN_STATUS_OPTIONS,
  STEP_STATUS_OPTIONS,
  STEP_TEMPLATES,
  type NewRunStepInput,
  type RiskLevel,
  type RunStatus,
  type StepStatus,
} from "@/types/run";
import { cn } from "@/lib/utils";

type StepDraft = NewRunStepInput;

const initialSteps = (): StepDraft[] =>
  STEP_TEMPLATES.map((tpl) => ({
    step_type: tpl.step_type,
    title: tpl.title,
    content: "",
    status: "success",
  }));

export function NewRunForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [agentName, setAgentName] = useState("");
  const [status, setStatus] = useState<RunStatus>("draft");
  const [risk, setRisk] = useState<RiskLevel>("low");
  const [steps, setSteps] = useState<StepDraft[]>(initialSteps);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateStep(index: number, patch: Partial<StepDraft>) {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    const trimmedAgent = agentName.trim();
    if (!trimmedTitle) {
      setError("Run title is required.");
      return;
    }
    if (!trimmedAgent) {
      setError("Agent name is required.");
      return;
    }

    setLoading(true);
    try {
      const run = await createRunWithStepsBrowser({
        project_id: projectId,
        title: trimmedTitle,
        agent_name: trimmedAgent,
        status,
        risk_level: risk,
        steps: steps.map((step) => ({
          ...step,
          content: step.content.trim(),
        })),
      });
      router.push(`/runs/${run.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create run.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="title">
            Run title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Swap 100 USDC → ETH on Base"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agent_name">
            Agent name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="agent_name"
            required
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="defi-agent-v1"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Run status</Label>
          <Select
            id="status"
            value={status}
            onChange={(value) => setStatus(value as RunStatus)}
            options={RUN_STATUS_OPTIONS}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="risk">Risk level</Label>
          <Select
            id="risk"
            value={risk}
            onChange={(value) => setRisk(value as RiskLevel)}
            options={RISK_LEVEL_OPTIONS}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Trace steps</h3>
          <p className="text-xs text-muted-foreground">
            Eight canonical steps. Fill in what happened at each one.
          </p>
        </div>
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li
              key={step.step_type}
              className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted font-mono text-xs">
                    {index + 1}
                  </span>
                  <p className="text-sm font-medium">{step.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor={`step-status-${index}`}
                    className="text-xs text-muted-foreground"
                  >
                    Status
                  </Label>
                  <Select
                    id={`step-status-${index}`}
                    value={step.status}
                    onChange={(value) =>
                      updateStep(index, { status: value as StepStatus })
                    }
                    options={STEP_STATUS_OPTIONS}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <Textarea
                id={`step-content-${index}`}
                rows={2}
                value={step.content}
                onChange={(e) => updateStep(index, { content: e.target.value })}
                placeholder="What happened at this step?"
              />
            </li>
          ))}
        </ol>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button asChild variant="outline" type="button" disabled={loading}>
          <Link href={`/projects/${projectId}`}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating…
            </>
          ) : (
            "Create run"
          )}
        </Button>
      </div>
    </form>
  );
}

function Select({
  id,
  value,
  onChange,
  options,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  className?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 capitalize",
        className,
      )}
    >
      {options.map((opt) => (
        <option key={opt} value={opt} className="capitalize">
          {opt}
        </option>
      ))}
    </select>
  );
}
