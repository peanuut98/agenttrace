"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

type LoginFormProps = {
  redirectTo: string;
};

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setError(null);
    setInfo(null);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const supabase = createClient();

    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        router.push(redirectTo);
        router.refresh();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        if (data.session) {
          router.push(redirectTo);
          router.refresh();
        } else {
          setInfo(
            "Account created. Check your inbox to confirm your email, then sign in.",
          );
          setMode("signin");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
        <button
          type="button"
          onClick={() => switchMode("signin")}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium transition-colors",
            mode === "signin"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium transition-colors",
            mode === "signup"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        {info ? (
          <p
            role="status"
            className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
          >
            {info}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {mode === "signin" ? "Signing in…" : "Creating account…"}
            </>
          ) : mode === "signin" ? (
            "Sign in"
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </div>
  );
}
