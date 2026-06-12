/**
 * Minimal ABI encoder for the AgentTraceProofRegistry.registerProof call.
 *
 * We deliberately avoid pulling in ethers/viem just to send one
 * `bytes32, string` call. The encoded calldata is built by hand using only
 * a local minimal keccak256 implementation (`./keccak256`) for the function
 * selector plus simple hex/string utilities.
 *
 * registerProof(bytes32 receiptHash, string publicReportUrl)
 *   selector = keccak256("registerProof(bytes32,string)")[:4]
 *
 * This file contains no secrets and runs only in the browser.
 */

import type { ProofRegistration } from "@/types/receipt";
import { functionSelector } from "./keccak256";

export const PROOF_REGISTRY_ABI = [
  {
    type: "function",
    name: "registerProof",
    stateMutability: "nonpayable",
    inputs: [
      { name: "receiptHash", type: "bytes32" },
      { name: "publicReportUrl", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "ProofRegistered",
    inputs: [
      { name: "receiptHash", type: "bytes32", indexed: true },
      { name: "publicReportUrl", type: "string", indexed: false },
      { name: "submitter", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

const REGISTER_PROOF_SELECTOR = functionSelector(
  "registerProof(bytes32,string)",
);

export const BASE_SEPOLIA = {
  chainId: 84532,
  chainIdHex: "0x14a34",
  name: "Base Sepolia",
  rpc: "https://sepolia.base.org",
  explorer: "https://sepolia.basescan.org",
  currency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
} as const;

/**
 * Normalise a receipt hash string ("sha256:abcd…" or "0xabcd…") to a 32-byte
 * hex string with `0x` prefix and exactly 64 hex chars. Throws if input
 * cannot be coerced to 32 bytes.
 */
export function toBytes32(receiptHash: string): `0x${string}` {
  let raw = receiptHash.trim();
  // strip prefixes like "sha256:"
  const colon = raw.indexOf(":");
  if (colon !== -1 && !raw.startsWith("0x")) {
    raw = raw.slice(colon + 1);
  }
  if (raw.startsWith("0x")) raw = raw.slice(2);
  if (!/^[0-9a-fA-F]+$/.test(raw)) {
    throw new Error(`receipt hash is not hex: ${receiptHash}`);
  }
  if (raw.length !== 64) {
    throw new Error(
      `receipt hash must be exactly 32 bytes (64 hex chars), got ${raw.length}`,
    );
  }
  return `0x${raw.toLowerCase()}` as `0x${string}`;
}

/**
 * Encode the calldata for registerProof(bytes32, string).
 *
 * ABI layout:
 *   selector (4 bytes)
 *   word 0  (32 bytes): bytes32 receiptHash
 *   word 1  (32 bytes): offset of dynamic string = 0x40
 *   word 2  (32 bytes): length of UTF-8 bytes
 *   word 3+ (32-byte chunks, right-padded with zeros): string data
 */
export function encodeRegisterProofCalldata(
  receiptHash: string,
  publicReportUrl: string,
): `0x${string}` {
  const hashHex = toBytes32(receiptHash).slice(2);

  const utf8 = new TextEncoder().encode(publicReportUrl);
  const lenHex = utf8.length.toString(16).padStart(64, "0");

  // hex of utf8 bytes, padded right to 32-byte boundary
  let bytesHex = "";
  for (const b of utf8) {
    bytesHex += b.toString(16).padStart(2, "0");
  }
  const padTo = Math.ceil(bytesHex.length / 64) * 64;
  bytesHex = bytesHex.padEnd(padTo, "0");

  // offset = 0x40 (= 64 = 2 words after the receiptHash word)
  const offsetHex = (0x40).toString(16).padStart(64, "0");

  return `0x${REGISTER_PROOF_SELECTOR.slice(2)}${hashHex}${offsetHex}${lenHex}${bytesHex}` as `0x${string}`;
}

export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export function getEthereum(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { ethereum?: EthereumProvider };
  return w.ethereum ?? null;
}

/** Ensure the wallet is connected and return the first account (lowercase). */
export async function ensureWalletConnected(eth: EthereumProvider): Promise<string> {
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error("Wallet did not return an account.");
  }
  return accounts[0].toLowerCase();
}

/** Ensure the wallet is on Base Sepolia (84532). Tries to switch, then to add. */
export async function ensureBaseSepolia(eth: EthereumProvider): Promise<void> {
  const current = (await eth.request({ method: "eth_chainId" })) as string;
  if (current?.toLowerCase() === BASE_SEPOLIA.chainIdHex) return;

  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_SEPOLIA.chainIdHex }],
    });
    return;
  } catch (err) {
    const code = (err as { code?: number })?.code;
    // 4902 = chain not added in this wallet — try to add it.
    if (code !== 4902) {
      throw new Error(
        "Please switch your wallet to Base Sepolia (chainId 84532).",
      );
    }
  }

  await eth.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: BASE_SEPOLIA.chainIdHex,
        chainName: BASE_SEPOLIA.name,
        nativeCurrency: BASE_SEPOLIA.currency,
        rpcUrls: [BASE_SEPOLIA.rpc],
        blockExplorerUrls: [BASE_SEPOLIA.explorer],
      },
    ],
  });
}

/**
 * Submit the registerProof transaction. Requires the user to confirm in
 * their wallet — AgentTrace never has the private key.
 *
 * Returns a partial ProofRegistration; caller fills in `submitted_at` and
 * persists via `saveProofRegistrationBrowser`.
 */
export async function submitProofRegistration(args: {
  contractAddress: string;
  receiptHash: string;
  publicReportUrl: string;
}): Promise<{
  txHash: string;
  fromAddress: string;
  registration: ProofRegistration;
}> {
  const eth = getEthereum();
  if (!eth) {
    throw new Error("No Ethereum provider detected. Install a wallet first.");
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(args.contractAddress)) {
    throw new Error(
      "NEXT_PUBLIC_PROOF_REGISTRY_ADDRESS is not a valid 0x-prefixed address.",
    );
  }

  const fromAddress = await ensureWalletConnected(eth);
  await ensureBaseSepolia(eth);

  const data = encodeRegisterProofCalldata(args.receiptHash, args.publicReportUrl);

  const txHash = (await eth.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: fromAddress,
        to: args.contractAddress,
        data,
      },
    ],
  })) as string;

  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    throw new Error(`Wallet returned an unexpected tx hash: ${txHash}`);
  }

  const submittedAt = new Date().toISOString();
  return {
    txHash,
    fromAddress,
    registration: {
      contract_address: args.contractAddress.toLowerCase(),
      tx_hash: txHash,
      chain_id: BASE_SEPOLIA.chainId,
      chain: BASE_SEPOLIA.name,
      submitted_at: submittedAt,
      submitter_address: fromAddress,
      explorer_url: `${BASE_SEPOLIA.explorer}/tx/${txHash}`,
      status: "submitted",
    },
  };
}
