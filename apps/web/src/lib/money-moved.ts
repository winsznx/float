/**
 * The failure that happens *after* money has already moved.
 *
 * Every on-chain flow in FLOAT is two phases: submit the transaction, then
 * record it. The second phase is a separate network call that can fail on its
 * own — a cold start, a dropped connection, a transient 5xx — and when it did,
 * the error propagated as if the whole operation had failed. Each screen then
 * returned the user to its confirm step with the button live again, and a retry
 * built and signed a brand-new transfer. Plain USDC transfers have no replay
 * protection and PledgeVault mints from an incrementing nonce, so the second
 * attempt was a second, real movement of funds.
 *
 * Throwing this instead lets a caller tell "nothing happened, safe to retry"
 * apart from "it happened, only the record is missing" — the two cases that
 * were indistinguishable, and the reason a network blip could cost a user twice.
 */
export class MoneyMovedError extends Error {
  readonly txHash: string;

  constructor(txHash: string, options?: { cause?: unknown }) {
    super(
      "Your money was sent, but we couldn't save it to your history. " +
        "Nothing was lost — the transaction is on-chain."
    );
    this.name = "MoneyMovedError";
    this.txHash = txHash;
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

const RETRY_DELAYS_MS = [400, 1200];

/**
 * Runs the record-keeping half of a money flow, retrying only that half.
 *
 * Retries are safe here in a way that retrying the transaction is not: this
 * touches Postgres, never the chain. Most failures in this window are transient,
 * so a couple of attempts turn what would be a dead end into a normal success.
 */
export async function recordAfterTransfer<T>(
  txHash: string,
  persist: () => Promise<T>
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await persist();
    } catch (caught) {
      lastError = caught;
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined) break;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new MoneyMovedError(txHash, { cause: lastError });
}
