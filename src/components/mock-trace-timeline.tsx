import {
  CheckCircle2,
  CircleDashed,
  Wallet,
  Brain,
  Wrench,
  Coins,
  Link2,
  ShieldCheck,
  FileCheck,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TraceStatus = "completed" | "pending";

export type TraceStep = {
  id: string;
  title: string;
  description: string;
  status: TraceStatus;
  timestamp: string;
  icon: LucideIcon;
  meta?: string;
};

const DEFAULT_STEPS: TraceStep[] = [
  {
    id: "intent",
    title: "User intent",
    description: "Swap 100 USDC to ETH on Base when gas < 0.5 gwei.",
    status: "completed",
    timestamp: "10:24:01",
    icon: Brain,
  },
  {
    id: "plan",
    title: "Execution plan",
    description: "Quote via 1inch → simulate → request signature → submit tx.",
    status: "completed",
    timestamp: "10:24:02",
    icon: FileCheck,
    meta: "4 steps",
  },
  {
    id: "tool",
    title: "Tool call",
    description: "1inch.quote(USDC → ETH, amount=100, chain=base)",
    status: "completed",
    timestamp: "10:24:03",
    icon: Wrench,
    meta: "200 OK",
  },
  {
    id: "payment",
    title: "Payment request",
    description: "Spend 100 USDC + ~0.0002 ETH gas.",
    status: "completed",
    timestamp: "10:24:05",
    icon: Coins,
  },
  {
    id: "wallet",
    title: "Wallet confirmation",
    description: "Signed by 0x91…a3F via WalletConnect.",
    status: "completed",
    timestamp: "10:24:18",
    icon: Wallet,
  },
  {
    id: "onchain",
    title: "On-chain transaction",
    description: "0xabc…def submitted to Base.",
    status: "completed",
    timestamp: "10:24:21",
    icon: Link2,
    meta: "Block 19,284,331",
  },
  {
    id: "verify",
    title: "Result verification",
    description: "Received 0.0421 ETH (within 0.3% slippage).",
    status: "completed",
    timestamp: "10:24:34",
    icon: ShieldCheck,
  },
  {
    id: "receipt",
    title: "Task receipt",
    description: "Generating shareable receipt…",
    status: "pending",
    timestamp: "—",
    icon: CircleDashed,
  },
];

type MockTraceTimelineProps = {
  steps?: TraceStep[];
};

export function MockTraceTimeline({
  steps = DEFAULT_STEPS,
}: MockTraceTimelineProps) {
  return (
    <ol className="relative space-y-5 border-l border-border/60 pl-6">
      {steps.map((step) => {
        const Icon = step.icon;
        const isDone = step.status === "completed";
        return (
          <li key={step.id} className="relative">
            <span
              className={cn(
                "absolute -left-[34px] flex size-7 items-center justify-center rounded-full ring-4 ring-background",
                isDone
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{step.title}</p>
              <Badge variant={isDone ? "secondary" : "outline"}>
                {isDone ? (
                  <>
                    <CheckCircle2 className="size-3" /> done
                  </>
                ) : (
                  <>
                    <CircleDashed className="size-3" /> pending
                  </>
                )}
              </Badge>
              {step.meta ? (
                <span className="text-xs text-muted-foreground">
                  {step.meta}
                </span>
              ) : null}
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {step.timestamp}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {step.description}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
