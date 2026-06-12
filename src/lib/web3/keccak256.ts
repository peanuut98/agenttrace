/**
 * Minimal Keccak-256 (Ethereum's hash, NOT NIST SHA-3-256).
 *
 * Used by `proof-registry.ts` to derive the function selector for
 * `registerProof(bytes32,string)` at module load. We avoid pulling in viem /
 * ethers / js-sha3 just to hash one short signature string.
 *
 * Pure function, no global state, no dependencies. Self-tested at the bottom
 * of the file against the well-known empty-string and "abc" digests; if the
 * implementation ever drifts, the module will throw at import time so a
 * silently-wrong selector can never reach the wallet.
 */

// Constants are constructed via BigInt() instead of 123n literals to keep
// the project's TS target (ES2017) happy. All modern browsers and Node 10+
// support the BigInt runtime regardless of TS target.
const RC: bigint[] = [
  "0x0000000000000001", "0x0000000000008082", "0x800000000000808a",
  "0x8000000080008000", "0x000000000000808b", "0x0000000080000001",
  "0x8000000080008081", "0x8000000000008009", "0x000000000000008a",
  "0x0000000000000088", "0x0000000080008009", "0x000000008000000a",
  "0x000000008000808b", "0x800000000000008b", "0x8000000000008089",
  "0x8000000000008003", "0x8000000000008002", "0x8000000000000080",
  "0x000000000000800a", "0x800000008000000a", "0x8000000080008081",
  "0x8000000000008080", "0x0000000080000001", "0x8000000080008008",
].map((s) => BigInt(s));

const R: number[] = [
  0, 1, 62, 28, 27,
  36, 44, 6, 55, 20,
  3, 10, 43, 25, 39,
  41, 45, 15, 21, 8,
  18, 2, 61, 56, 14,
];

const ZERO = BigInt(0);
const ONE = BigInt(1);
const SIXTY_FOUR = BigInt(64);
const EIGHT = BigInt(8);
const FF = BigInt(0xff);
const MASK = (ONE << SIXTY_FOUR) - ONE;

function rotl64(x: bigint, n: number): bigint {
  const m = BigInt(n % 64);
  return (((x << m) | (x >> (SIXTY_FOUR - m))) & MASK);
}

function keccakF(state: bigint[]): void {
  for (let round = 0; round < 24; round++) {
    // θ
    const C: bigint[] = new Array(5);
    for (let x = 0; x < 5; x++) {
      C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
    }
    const D: bigint[] = new Array(5);
    for (let x = 0; x < 5; x++) {
      D[x] = C[(x + 4) % 5] ^ rotl64(C[(x + 1) % 5], 1);
    }
    for (let i = 0; i < 25; i++) {
      state[i] = state[i] ^ D[i % 5];
    }
    // ρ and π
    const B: bigint[] = new Array(25).fill(ZERO);
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const idx = x + 5 * y;
        const newX = y;
        const newY = (2 * x + 3 * y) % 5;
        B[newX + 5 * newY] = rotl64(state[idx], R[idx]);
      }
    }
    // χ
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        state[x + 5 * y] =
          B[x + 5 * y] ^ ((~B[((x + 1) % 5) + 5 * y]) & MASK & B[((x + 2) % 5) + 5 * y]);
      }
    }
    // ι
    state[0] = state[0] ^ RC[round];
  }
}

/**
 * Keccak-256 (rate=1088 bits = 136 bytes, capacity=512 bits, padding 0x01...0x80).
 * Returns a 32-byte Uint8Array.
 */
export function keccak256(input: Uint8Array): Uint8Array {
  const rate = 136;
  const blocks = Math.ceil((input.length + 1) / rate);
  const padded = new Uint8Array(blocks * rate);
  padded.set(input);
  padded[input.length] = 0x01; // Keccak padding (NOT 0x06 — that's NIST SHA-3)
  padded[padded.length - 1] |= 0x80;

  const state: bigint[] = new Array(25).fill(ZERO);

  for (let b = 0; b < blocks; b++) {
    for (let i = 0; i < rate / 8; i++) {
      let lane = ZERO;
      for (let j = 0; j < 8; j++) {
        lane |= BigInt(padded[b * rate + i * 8 + j]) << BigInt(8 * j);
      }
      state[i] = state[i] ^ lane;
    }
    keccakF(state);
  }

  const out = new Uint8Array(32);
  for (let i = 0; i < 4; i++) {
    let lane = state[i];
    for (let j = 0; j < 8; j++) {
      out[i * 8 + j] = Number(lane & FF);
      lane >>= EIGHT;
    }
  }
  return out;
}

export function keccak256Hex(input: string | Uint8Array): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = keccak256(bytes);
  let hex = "";
  for (const b of digest) hex += b.toString(16).padStart(2, "0");
  return hex;
}

/**
 * 4-byte function selector = first 4 bytes of keccak256(signature).
 */
export function functionSelector(signature: string): `0x${string}` {
  return `0x${keccak256Hex(signature).slice(0, 8)}` as `0x${string}`;
}

// ---------------------------------------------------------------------------
// Self-test at module load. If keccak256 is broken, throw IMMEDIATELY rather
// than silently producing a wrong function selector.
// ---------------------------------------------------------------------------

(function selfTest() {
  // keccak256("") = c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470
  const empty = keccak256Hex("");
  if (empty !== "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470") {
    throw new Error("keccak256 self-test failed (empty)");
  }
  // keccak256("abc") = 4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45
  const abc = keccak256Hex("abc");
  if (abc !== "4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45") {
    throw new Error("keccak256 self-test failed (abc)");
  }
})();
