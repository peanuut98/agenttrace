import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { next } = await searchParams;
  const redirectTo = next && next.startsWith("/") ? next : "/dashboard";

  if (user) {
    redirect(redirectTo);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">Welcome to AgentTrace</CardTitle>
          <CardDescription>
            Sign in or create an account to start tracing your Web3 AI Agent
            runs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm redirectTo={redirectTo} />
        </CardContent>
      </Card>
    </div>
  );
}
