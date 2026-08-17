/**
 * Single-use login nonces for wallet sign-in.
 *
 * On Workers these cannot live in module memory: the isolate that issues a
 * nonce is routinely not the isolate that verifies it, so a Map here would
 * make sign-in fail most of the time. The store is a Durable Object instead
 * (see worker.ts) — still five-minute TTL, still consumed on first use, which
 * is what stops a captured signature being replayed.
 */

export const NONCE_TTL_MS = 5 * 60 * 1000;

/** What the tRPC layer needs; implemented by the LoginNonces Durable Object. */
export interface LoginNonceStore {
  issue(address: string): Promise<{ nonce: string; message: string }>;
  consume(address: string, nonce: string): Promise<string | null>;
}

/** Human-readable so the wallet's signing prompt says what it's for. */
export function loginMessage(address: string, nonce: string): string {
  return [
    "Sign in to FLOAT",
    "",
    `Address: ${address.toLowerCase()}`,
    `Nonce: ${nonce}`,
    "",
    "This signature proves you control this wallet. It costs no gas and",
    "authorizes no transaction.",
  ].join("\n");
}
