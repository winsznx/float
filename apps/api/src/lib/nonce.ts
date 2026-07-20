import { randomBytes } from "node:crypto";

/**
 * Single-use login nonces for wallet sign-in.
 *
 * Held in memory deliberately: they live for five minutes, are consumed on
 * first use, and losing them on restart is harmless — the user just signs
 * again. Persisting them would add a table whose only job is to be emptied.
 *
 * Consuming on read is what stops a captured signature being replayed.
 */
const TTL_MS = 5 * 60 * 1000;
const nonces = new Map<string, { nonce: string; expiresAt: number }>();

function sweep(): void {
  const now = Date.now();
  for (const [key, entry] of nonces) {
    if (entry.expiresAt < now) nonces.delete(key);
  }
}

export function issueNonce(address: string): { nonce: string; message: string } {
  sweep();
  const nonce = randomBytes(16).toString("hex");
  nonces.set(address.toLowerCase(), { nonce, expiresAt: Date.now() + TTL_MS });

  // Human-readable so the wallet's signing prompt says what it's for.
  const message = [
    "Sign in to FLOAT",
    "",
    `Address: ${address.toLowerCase()}`,
    `Nonce: ${nonce}`,
    "",
    "This signature proves you control this wallet. It costs no gas and",
    "authorizes no transaction.",
  ].join("\n");

  return { nonce, message };
}

/** Verifies and consumes. A nonce is never valid twice. */
export function consumeNonce(address: string, nonce: string): string | null {
  sweep();
  const key = address.toLowerCase();
  const entry = nonces.get(key);
  if (!entry || entry.nonce !== nonce || entry.expiresAt < Date.now()) {
    return null;
  }
  nonces.delete(key);

  return [
    "Sign in to FLOAT",
    "",
    `Address: ${key}`,
    `Nonce: ${nonce}`,
    "",
    "This signature proves you control this wallet. It costs no gas and",
    "authorizes no transaction.",
  ].join("\n");
}
