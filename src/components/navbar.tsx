import Link from "next/link";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <Activity className="size-5 text-primary" />
          <span>AgentTrace</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Home</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          {user ? (
            <>
              <span
                className="hidden max-w-[14rem] truncate px-2 text-xs text-muted-foreground sm:inline"
                title={user.email ?? ""}
              >
                {user.email}
              </span>
              <SignOutButton />
            </>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
