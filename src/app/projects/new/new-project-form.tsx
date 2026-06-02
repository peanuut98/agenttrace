"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProjectBrowser } from "@/lib/storage";

function trimOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function NewProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [chain, setChain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Project name is required.");
      return;
    }

    setLoading(true);
    try {
      const project = await createProjectBrowser({
        name: trimmedName,
        description: trimOrNull(description),
        github_url: trimOrNull(githubUrl),
        demo_url: trimOrNull(demoUrl),
        wallet_address: trimOrNull(walletAddress),
        chain: trimOrNull(chain),
      });
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create project.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Web3 Agent"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this Agent do?"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="github_url">GitHub URL</Label>
          <Input
            id="github_url"
            type="url"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/you/repo"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="demo_url">Demo URL</Label>
          <Input
            id="demo_url"
            type="url"
            value={demoUrl}
            onChange={(e) => setDemoUrl(e.target.value)}
            placeholder="https://demo.example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wallet_address">Wallet address</Label>
          <Input
            id="wallet_address"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x…"
            spellCheck={false}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="chain">Chain</Label>
          <Input
            id="chain"
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            placeholder="Base, Ethereum, Solana…"
          />
        </div>
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
          <Link href="/dashboard">Cancel</Link>
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating…
            </>
          ) : (
            "Create project"
          )}
        </Button>
      </div>
    </form>
  );
}
