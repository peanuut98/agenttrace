import Link from "next/link";
import {
  ArrowRight,
  Brain,
  ClipboardCheck,
  ShieldCheck,
  Wallet,
  Wrench,
  Receipt,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureCard } from "@/components/feature-card";
import { MockTraceTimeline } from "@/components/mock-trace-timeline";

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-16">
      <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <Badge variant="outline" className="rounded-full">
            Day 1 · Foundation
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Audit receipts for every Web3 AI Agent task.
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            AgentTrace records intent, plans, tool calls, payment requests,
            wallet confirmations, on-chain transactions and verified results
            from one Agent run, then turns them into a shareable Task Receipt.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">
                View demo dashboard <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Demo data only · no wallets, no AI calls, no accounts.
          </p>
        </div>

        <Card className="bg-card/60">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sample trace · swap 100 USDC → ETH on Base
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MockTraceTimeline />
          </CardContent>
        </Card>
      </section>

      <section className="mt-20 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            What gets captured
          </h2>
          <p className="text-sm text-muted-foreground">
            Every Agent run produces a structured, replayable trace.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={Brain}
            title="Intent & plan"
            description="Capture the user's natural-language goal alongside the Agent's planned tool sequence."
          />
          <FeatureCard
            icon={Wrench}
            title="Tool calls"
            description="Log every tool invocation, its arguments, and its raw response with timestamps."
          />
          <FeatureCard
            icon={Wallet}
            title="Wallet confirmation"
            description="Show the user exactly what they signed before any transaction is broadcast."
          />
          <FeatureCard
            icon={ShieldCheck}
            title="On-chain verification"
            description="Match expected and actual outcomes — slippage, gas spent, balances after."
          />
          <FeatureCard
            icon={ClipboardCheck}
            title="Replayable steps"
            description="Inspect a run end to end, step by step, to debug or audit failures."
          />
          <FeatureCard
            icon={Receipt}
            title="Shareable receipts"
            description="Export a Task Receipt that anyone can open, verify and reference later."
          />
        </div>
      </section>
    </div>
  );
}
