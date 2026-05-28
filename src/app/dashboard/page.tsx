import { Activity, CheckCircle2, Receipt, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MockTraceTimeline } from "@/components/mock-trace-timeline";
import { StatsCard } from "@/components/stats-card";

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Demo workspace · static mock data for Day 1.
          </p>
        </div>
        <Badge variant="secondary">Mock data</Badge>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Traces"
          value="128"
          hint="Last 7 days"
          icon={Activity}
        />
        <StatsCard
          label="Successful runs"
          value="121"
          hint="94.5% success rate"
          icon={CheckCircle2}
        />
        <StatsCard
          label="Wallet confirmations"
          value="46"
          hint="Across 3 chains"
          icon={Wallet}
        />
        <StatsCard
          label="Receipts issued"
          value="119"
          hint="Shareable by URL"
          icon={Receipt}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Latest trace</CardTitle>
          <CardDescription>
            Swap 100 USDC → ETH on Base · trace_0x9c4f
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MockTraceTimeline />
        </CardContent>
      </Card>
    </div>
  );
}
