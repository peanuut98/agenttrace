# Contract Deployment — AgentTraceProofRegistry

This guide walks through deploying `AgentTraceProofRegistry.sol` to **Base Sepolia** (testnet) using **Remix** + **MetaMask**.

The contract is deliberately minimal — it only emits an event and never holds funds. See `contracts/AgentTraceProofRegistry.sol` and the inline comments for the full safety rationale.

## Prerequisites

- A browser wallet (MetaMask recommended) with **Base Sepolia** added
- A small amount of Base Sepolia ETH for gas (use a public faucet)
- Solidity compiler 0.8.20+

## Network details

| Field      | Value                            |
| ---------- | -------------------------------- |
| Network    | Base Sepolia                     |
| Chain ID   | 84532                            |
| RPC        | <https://sepolia.base.org>       |
| Block expl | <https://sepolia.basescan.org>   |
| Faucet     | <https://www.alchemy.com/faucets/base-sepolia> |

> **Do not deploy to mainnet.** This contract is for testnet demos only. There is no access control review.

## Step-by-step (Remix)

1. Open <https://remix.ethereum.org>.
2. In the **File explorer** create a new file `AgentTraceProofRegistry.sol`.
3. Paste the contents of `contracts/AgentTraceProofRegistry.sol` from this repository.
4. Open the **Solidity Compiler** tab.
   - Compiler version: `0.8.20` or any `0.8.x` ≥ `0.8.20`
   - Click **Compile AgentTraceProofRegistry.sol**
   - Confirm the green checkmark and zero warnings.
5. Open the **Deploy & Run Transactions** tab.
   - Environment: **Injected Provider — MetaMask**
   - Confirm the **Account** is the address you intend to use as deployer.
   - Confirm MetaMask is on **Base Sepolia** (chain ID 84532). If not, switch in MetaMask first.
   - Contract: **AgentTraceProofRegistry**
   - Click **Deploy**.
6. MetaMask will prompt you to confirm the deployment transaction. **Manually confirm** in the wallet.
7. After confirmation, Remix shows the deployed contract under **Deployed Contracts**. Copy:
   - The **contract address**
   - The **deployment transaction hash** (from the Remix terminal, or from MetaMask activity)
8. Verify on BaseScan:
   - <https://sepolia.basescan.org/address/CONTRACT_ADDRESS>
   - Optional: use **Verify and Publish** with the same source and `0.8.20` compiler so the source is publicly readable.

## Wire the address into AgentTrace

After deployment, set the public env var so the front-end button knows where to call:

```env
# .env.local
NEXT_PUBLIC_PROOF_REGISTRY_ADDRESS=0xYourDeployedContractAddress
```

> The contract address is **public** — it is safe to ship as `NEXT_PUBLIC_*`. Never put private keys, mnemonics, or RPC keys with credit into `NEXT_PUBLIC_*` variables.

Restart `npm run dev` so Next.js re-reads the env var.

## Placeholders to fill in after deployment

```text
- Contract Address:   0x________________________________________
- Deployment Tx:      0x________________________________________
- Network:            Base Sepolia
- Chain ID:           84532
- Compiler Version:   0.8.20+
- Deployer Address:   0x________________________________________
```

## Sanity check

1. After deployment, on the AgentTrace Public Report page, click **Register Proof On-chain** (only visible in dev mode).
2. MetaMask should prompt with `registerProof(bytes32 receiptHash, string publicReportUrl)`.
3. Confirm in the wallet. The transaction will be visible on BaseScan after a few seconds.
4. The Public Report should now show the **Proof Registration Tx** with a BaseScan link.

## Safety boundaries

- AgentTrace **does not** hold private keys. Every registration requires manual wallet confirmation.
- The contract has **no payable functions** and **cannot** receive ETH or tokens.
- The contract has **no admin** and **no upgrade path**. It is a write-only event index.
- This deployment is **testnet only**. Re-audit before any mainnet use.
