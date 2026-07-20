const FALLBACK_MESSAGE = "Something went wrong. Try again.";

/**
 * Bundler and SDK errors surface as opaque codes. "AA24 signature error" is
 * meaningless to someone trying to send money, so the ones users can actually
 * hit are translated into something they can act on.
 */
const KNOWN: Array<[RegExp, string]> = [
  [/AA24|signature error/i, "Couldn't verify your signature. Sign in again and retry."],
  [/AA21|didn't pay|prefund/i, "Not enough balance to cover this transfer."],
  [/AA13|AA23|initCode|sender/i, "Your account isn't ready yet. Wait a moment and retry."],
  [/insufficient|exceeds balance/i, "Not enough balance for that amount."],
  [/user rejected|user denied|4001/i, "You cancelled the signature."],
  [/is not supported by universal account/i, "That chain isn't supported yet."],
  [/fetch failed|ECONNRESET|ETIMEDOUT|Failed to fetch/i, "Network hiccup. Check your connection and retry."],
  [/not a constructor/i, "Something failed to load. Refresh the page and retry."],
];

/**
 * Normalizes anything thrown by an SDK, contract call, or network request into
 * a string safe to render. Wallet SDKs reject with a mix of Error instances,
 * plain objects, and strings, so unknown shapes fall back to a generic message
 * rather than rendering "[object Object]".
 */
export function getErrorMessage(error: unknown): string {
  // Always log the original. The friendly text below is deliberately lossy,
  // and without this the underlying cause is unrecoverable from a bug report —
  // which cost real debugging time when a mapped message hid the actual error.
  if (typeof window !== "undefined" && error) {
    console.error("[float] original error:", error);
  }

  const raw =
    error instanceof Error && error.message
      ? error.message
      : typeof error === "string" && error
        ? error
        : "";

  if (!raw) return FALLBACK_MESSAGE;

  for (const [pattern, message] of KNOWN) {
    if (pattern.test(raw)) return message;
  }

  // Long SDK stack dumps are worse than saying nothing useful.
  return raw.length > 160 ? FALLBACK_MESSAGE : raw;
}
