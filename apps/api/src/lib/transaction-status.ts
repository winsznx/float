import { UA_TRANSACTION_STATUS } from "@particle-network/universal-account-sdk";
import { accountFor } from "./balance.js";

/**
 * Resolves a submitted send against the Universal Account that sent it.
 *
 * Sends were written `submitted` with a comment promising the indexer would
 * confirm them, but the indexer only watches LeashManager and PledgeVault — it
 * has no send handler at all. So no send ever left `submitted`, and the
 * history rendered a `confirmed` state that nothing could reach.
 *
 * Particle is the right authority here rather than a log scan: a send is one
 * cross-chain route, and `getTransaction` reports the outcome of the whole
 * route rather than of one leg on one chain.
 */

/** The subset of sends.status this seam can produce. `pending` means no tx. */
export type SendStatus = "submitted" | "confirmed" | "failed";

/**
 * Only terminal states move a row. Everything else — deposit and execution
 * phases — is still in flight and stays `submitted`.
 *
 * A refund in any of its phases counts as failed: the transfer did not land,
 * and the money is on its way back to the sender.
 */
const TERMINAL_STATUS: Record<number, SendStatus> = {
  [UA_TRANSACTION_STATUS.FINISHED]: "confirmed",
  [UA_TRANSACTION_STATUS.EXECUTION_FAILED]: "failed",
  [UA_TRANSACTION_STATUS.WAIT_TO_REFUND]: "failed",
  [UA_TRANSACTION_STATUS.REFUND_LOCAL]: "failed",
  [UA_TRANSACTION_STATUS.REFUND_PENDING]: "failed",
  [UA_TRANSACTION_STATUS.REFUND_FAILED]: "failed",
  [UA_TRANSACTION_STATUS.REFUND_FINISHED]: "failed",
  [UA_TRANSACTION_STATUS.PENNY_FAILED]: "failed",
};

/**
 * `getTransaction` is typed `Promise<any>` by the SDK, so the status is dug out
 * by inspection rather than trusted. An unreadable response returns null and
 * the caller leaves the row untouched — guessing at a terminal state would
 * mark money confirmed that may not have moved.
 */
function readStatusCode(value: unknown): number | null {
  if (typeof value !== "object" || value === null) return null;
  if (!("status" in value)) return null;
  const { status } = value;
  return typeof status === "number" ? status : null;
}

export async function fetchSendStatus(
  ownerAddress: string,
  transactionId: string
): Promise<SendStatus | null> {
  const detail: unknown = await accountFor(ownerAddress).getTransaction(transactionId);
  const code = readStatusCode(detail);
  if (code === null) return null;
  return TERMINAL_STATUS[code] ?? "submitted";
}
