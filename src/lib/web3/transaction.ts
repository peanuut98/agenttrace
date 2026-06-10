/**
 * Transaction context fetcher for Transaction-to-Trace feature.
 *
 * Alpha version: supports Base Sepolia and Ethereum Sepolia with explorer API
 * fallback to mock data when API keys are not configured.
 */

export type TransactionContext = {
  chain: string;
  tx_hash: string;
  status: "success" | "failed" | "pending" | "unknown";
  from: string;
  to: string | null;
  value: string;
  gas_used: string;
  block_number: string;
  timestamp: string;
  method: string;
  explorer_url: string;
  is_mock: boolean;
};

const EXPLORER_URLS: Record<string, string> = {
  "Base Sepolia": "https://sepolia.basescan.org",
  "Ethereum Sepolia": "https://sepolia.etherscan.io",
};

const EXPLORER_API_URLS: Record<string, string> = {
  "Base Sepolia": "https://api-sepolia.basescan.org/api",
  "Ethereum Sepolia": "https://api-sepolia.etherscan.io/api",
};

function getApiKey(chain: string): string | undefined {
  if (chain === "Base Sepolia") {
    return process.env.NEXT_PUBLIC_BASESCAN_API_KEY;
  }
  if (chain === "Ethereum Sepolia") {
    return process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
  }
  return undefined;
}

function getMockTransactionContext(
  chain: string,
  txHash: string,
): TransactionContext {
  return {
    chain,
    tx_hash: txHash,
    status: "success",
    from: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
    to: "0x1234567890AbcdEF1234567890aBcdef12345678",
    value: "0.05 ETH",
    gas_used: "21000",
    block_number: "12345678",
    timestamp: new Date().toISOString(),
    method: "transfer",
    explorer_url: `${EXPLORER_URLS[chain] ?? "https://sepolia.basescan.org"}/tx/${txHash}`,
    is_mock: true,
  };
}

async function fetchFromExplorer(
  chain: string,
  txHash: string,
  apiKey: string,
): Promise<TransactionContext | null> {
  const apiUrl = EXPLORER_API_URLS[chain];
  if (!apiUrl) return null;

  try {
    const url = `${apiUrl}?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.result) return null;

    const tx = data.result;

    const receiptUrl = `${apiUrl}?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${apiKey}`;
    const receiptResponse = await fetch(receiptUrl);
    const receiptData = await receiptResponse.json();
    const receipt = receiptData.result;

    const blockUrl = `${apiUrl}?module=proxy&action=eth_getBlockByNumber&tag=${tx.blockNumber}&boolean=false&apikey=${apiKey}`;
    const blockResponse = await fetch(blockUrl);
    const blockData = await blockResponse.json();
    const block = blockData.result;

    const status = receipt?.status === "0x1" ? "success" : "failed";
    const gasUsed = receipt?.gasUsed
      ? parseInt(receipt.gasUsed, 16).toString()
      : "unknown";
    const blockNumber = tx.blockNumber
      ? parseInt(tx.blockNumber, 16).toString()
      : "unknown";
    const timestamp = block?.timestamp
      ? new Date(parseInt(block.timestamp, 16) * 1000).toISOString()
      : new Date().toISOString();
    const value = tx.value
      ? `${(parseInt(tx.value, 16) / 1e18).toFixed(6)} ETH`
      : "0 ETH";

    let method = "unknown";
    if (tx.input && tx.input.length >= 10) {
      const methodId = tx.input.slice(0, 10);
      method = methodId;
    } else if (tx.input === "0x") {
      method = "transfer";
    }

    return {
      chain,
      tx_hash: txHash,
      status,
      from: tx.from ?? "unknown",
      to: tx.to ?? null,
      value,
      gas_used: gasUsed,
      block_number: blockNumber,
      timestamp,
      method,
      explorer_url: `${EXPLORER_URLS[chain]}/tx/${txHash}`,
      is_mock: false,
    };
  } catch (error) {
    console.error("Failed to fetch transaction from explorer:", error);
    return null;
  }
}

export async function fetchTransactionContext(
  chain: string,
  txHash: string,
): Promise<TransactionContext> {
  const apiKey = getApiKey(chain);

  if (apiKey) {
    const result = await fetchFromExplorer(chain, txHash, apiKey);
    if (result) return result;
  }

  return getMockTransactionContext(chain, txHash);
}
