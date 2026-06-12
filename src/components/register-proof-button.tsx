"use client";

import { useState } from "react";
import {
  ExternalLink,
  Loader2,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BASE_SEPOLIA,
  submitProofRegistration,
  getEthereum,
} from "@/lib/web3/proof-registry";
import { saveProofRegistrationBrowser } from "@/lib/storage";
import type { ProofRegistration } from "@/types/receipt";

type Props = {
  runId: string;
  receiptHash: string;
  publicReportUrl: string;
  existing: ProofRegistration | null | undefined;
  onRegistered: (next: ProofRegistration) => void;
};

/**
 * RegisterProofButton
 *
 * Visible only when:
 *   - NEXT_PUBLIC_DEV_MODE === "true"
 *   - NEXT_PUBLIC_PROOF_REGISTRY_ADDRESS is set
 *   - window.ethereum is present
 *
 * Click flow:
 *   1. Connect wallet (eth_requestAccounts) — manual confirm in wallet
 *   2. Switch / add Base Sepolia (chainId 84532) — manual confirm in wallet
 *   3. Encode registerProof(bytes32, string) calldata
 *   4. eth_sendTransaction → user confirms in wallet
 *   5. Persist tx_hash + metadata via saveProofRegistrationBrowser
 *
 * AgentTrace never holds a private key. Every step requires manual wallet
 * confirmation. The contract holds no funds.
 */
export function RegisterProofButton({
  runId,
  receiptHash,
  publicReportUrl,
  existing,
  onRegistered,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true";
  const contractAddress =
    process.env.NEXT_PUBLIC_PROOF_REGISTRY_ADDRESS?.trim() ?? "";
  const hasWallet = typeof window !== "undefined" && !!getEthereum();

  if (!isDevMode) return null;
  if (!contractAddress) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        On-chain proof registration is unavailable:{" "}
        <code className="font-mono">NEXT_PUBLIC_PROOF_REGISTRY_ADDRESS</code> is
        not set. Deploy the contract first (see{" "}
        <code className="font-mono">docs/CONTRACT_DEPLOYMENT.md</code>).
      </div>
    );
  }
  if (!hasWallet) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        On-chain proof registration requires a browser wallet (e.g. MetaMask).
        No <code className="font-mono">window.ethereum</code> detected.
      </div>
    );
  }

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      const { registration } = await submitProofRegistration({
        contractAddress,
        receiptHash,
        publicReportUrl,
      });
      const updated = await saveProofRegistrationBrowser(runId, registration);
      const finalReg = updated.proof_registration ?? registration;
      onRegistered(finalReg);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to register proof.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <Wallet className="size-4" />
        <span className="font-semibold">Register Proof On-chain (dev)</span>
        <Badge variant="outline" className="font-mono">
          {BASE_SEPOLIA.name} · chainId {BASE_SEPOLIA.chainId}
        </Badge>
      </div>

      <p className="text-muted-foreground">
        Anchors the receipt hash and this report URL on-chain by calling{" "}
        <code className="font-mono">registerProof()</code> on the
        AgentTraceProofRegistry contract.
      </p>

      <SafetyNotice />

      {existing ? (
        <RegistrationSummary registration={existing} />
      ) : (
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={handleClick}
          disabled={busy}
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Awaiting wallet confirmation…
            </>
          ) : (
            <>
              <Wallet className="size-4" />
              Register Proof On-chain
            </>
          )}
        </Button>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
          <div className="break-words font-mono">{error}</div>
        </div>
      )}
    </div>
  );
}

function SafetyNotice() {
  return (
    <ul className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-200">
      <li>AgentTrace does not hold private keys.</li>
      <li>This action requires manual wallet confirmation.</li>
      <li>This contract does not transfer funds.</li>
      <li>This only anchors the receipt hash on-chain.</li>
      <li>Testnet only (Base Sepolia) — for demo purposes.</li>
    </ul>
  );
}

function RegistrationSummary({
  registration,
}: {
  registration: ProofRegistration;
}) {
  return (
    <dl className="grid gap-2 rounded-md border bg-background/40 p-3 sm:grid-cols-2">
      <Field label="Contract" value={registration.contract_address} mono />
      <Field label="Tx Hash" value={registration.tx_hash} mono />
      <Field
        label="Network"
        value={`${registration.chain} (chainId ${registration.chain_id})`}
      />
      <Field label="Submitter" value={registration.submitter_address} mono />
      <Field label="Status" value={registration.status} />
      <Field label="Submitted" value={registration.submitted_at} />
      <div className="sm:col-span-2">
        <a
          href={registration.explorer_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
        >
          View on BaseScan <ExternalLink className="size-3.5" />
        </a>
      </div>
    </dl>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "break-all font-mono text-[11px]"
            : "break-words text-[11px]"
        }
      >
        {value}
      </dd>
    </div>
  );
}
