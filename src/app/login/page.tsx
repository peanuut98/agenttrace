import Link from "next/link";
import { Wallet, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">Sign in to AgentTrace</CardTitle>
          <CardDescription>
            Day 1 placeholder — no real authentication yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" disabled>
            <Wallet className="size-4" />
            Connect wallet
          </Button>
          <Button variant="outline" className="w-full" disabled>
            <Mail className="size-4" />
            Continue with email
          </Button>
          <p className="pt-2 text-center text-xs text-muted-foreground">
            Auth wiring is planned for a later day. For now,{" "}
            <Link
              href="/dashboard"
              className="font-medium text-foreground underline underline-offset-4"
            >
              preview the dashboard
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
