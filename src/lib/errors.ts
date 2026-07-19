const FALLBACK_MESSAGE = "Something went wrong. Try again.";

/**
 * Normalizes anything thrown by an SDK, contract call, or network request into
 * a string safe to render. Wallet SDKs reject with a mix of Error instances,
 * plain objects, and strings, so unknown shapes fall back to a generic message
 * rather than rendering "[object Object]".
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}
