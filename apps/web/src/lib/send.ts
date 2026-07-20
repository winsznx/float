import { api } from "@/lib/api";
import {
  createUniversalAccount,
  createUsdcTransfer,
  destinationChainFor,
  executedChains,
  chainLabelFor,
  quoteOf,
  type TransferQuote,
} from "@/lib/chain/universal-account";
import { signUniversalTransaction, ensureDelegated } from "@/lib/chain/signer";
import { readSession } from "@/lib/session";
import { recordAfterTransfer } from "@/lib/money-moved";
import type { IdentityResolution } from "@/lib/identity";

export type SendReceipt = {
  id: string;
  txId: string;
  timestamp: number;
  /** Capability token for the public /r/[token] receipt page. */
  shareToken: string;
  status: string;
};

type SendPaymentParams = {
  recipient: IdentityResolution;
  amount: number;
  note: string;
};

export type SendQuote = TransferQuote & {
  destinationChain: string;
  /**
   * The chain the route actually draws from, per Particle's quote. Null when
   * it sources from several. The confirm card used to name whichever chain
   * held the largest balance, which is a guess, not the route.
   */
  sourceChain: string | null;
};

/**
 * Prices a send without committing to it.
 *
 * Builds the same transfer the confirm step will submit and returns what
 * Particle quoted for it. Deliberately does NOT call ensureDelegated: that is
 * the one step in the path that can raise a Magic signing prompt, and pricing a
 * transfer must never ask the user to sign anything.
 *
 * Returns null when there is nothing to price — an unresolved recipient gets a
 * claim link, and no transfer is built at all.
 */
export async function quoteSend({
  recipient,
  amount,
}: Omit<SendPaymentParams, "note">): Promise<SendQuote | null> {
  const session = readSession();
  if (!session || !recipient.resolvedAddress) return null;

  const ua = createUniversalAccount(session.address);
  const destination = destinationChainFor(recipient.preferredChain);
  const tx = await createUsdcTransfer(
    ua,
    recipient.resolvedAddress,
    String(amount),
    destination.id
  );

  const { sourceChainId } = executedChains(tx);
  return {
    ...quoteOf(tx),
    destinationChain: destination.label,
    sourceChain: sourceChainId === null ? null : chainLabelFor(sourceChainId),
  };
}

/**
 * Persists the send and returns the stored row. The chain transaction is
 * signed in the browser (the UA owner key never leaves the client); the hash
 * is attached here and the indexer confirms it.
 */
export async function sendPayment({
  recipient,
  amount,
  note,
}: SendPaymentParams): Promise<SendReceipt> {
  const session = readSession();
  if (!session) throw new Error("Sign in to send.");

  let txHash: string | undefined;
  // Left undefined for a claim link: nothing moved, so no chain carried it.
  let sourceChainId: number | undefined;
  let destChainId: number | undefined;

  // A recipient with no address yet gets a claim link instead of a transfer —
  // sending to nowhere would strand the money.
  if (recipient.resolvedAddress) {
    await ensureDelegated(session.address);
    const ua = createUniversalAccount(session.address);
    // The recipient's chain, not ours. This is the "any chain" half that was
    // missing: the destination was pinned to Arbitrum while the UI named
    // whichever chain the recipient actually holds on.
    const destination = destinationChainFor(recipient.preferredChain);
    const tx = await createUsdcTransfer(
      ua,
      recipient.resolvedAddress,
      String(amount),
      destination.id
    );
    const { rootSignature, authorizations } = await signUniversalTransaction(
      session.address,
      tx
    );
    const result = await ua.sendTransaction(
      tx,
      rootSignature,
      authorizations.length > 0 ? authorizations : undefined
    );
    txHash = result?.transactionId ?? tx.transactionId;

    const executed = executedChains(tx);
    sourceChainId = executed.sourceChainId ?? undefined;
    destChainId = executed.destChainId ?? destination.id;
  }

  const persist = () =>
    api.send.create.mutate({
      recipient: recipient.input,
      amount,
      note: note || undefined,
      txHash,
      sourceChainId,
      destChainId,
    });

  // With a hash the transfer is already on-chain, so a failure here must never
  // reach a caller that would let the user send again. Without one nothing
  // moved — a claim link — and the normal error path is correct.
  const row = txHash ? await recordAfterTransfer(txHash, persist) : await persist();

  return {
    id: row.id,
    txId: row.tx_hash ?? row.id,
    timestamp: new Date(row.created_at).getTime(),
    shareToken: row.share_token,
    status: row.status,
  };
}
