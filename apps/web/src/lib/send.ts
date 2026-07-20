import { api } from "@/lib/api";
import { createUniversalAccount, createUsdcTransfer } from "@/lib/chain/universal-account";
import { signUniversalTransaction, ensureDelegated } from "@/lib/chain/signer";
import { readSession } from "@/lib/session";
import type { IdentityResolution } from "@/lib/identity";

export type SendReceipt = {
  id: string;
  txId: string;
  timestamp: number;
};

type SendPaymentParams = {
  recipient: IdentityResolution;
  amount: number;
  note: string;
};

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

  // A recipient with no address yet gets a claim link instead of a transfer —
  // sending to nowhere would strand the money.
  if (recipient.resolvedAddress) {
    await ensureDelegated(session.address);
    const ua = createUniversalAccount(session.address);
    const tx = await createUsdcTransfer(ua, recipient.resolvedAddress, String(amount));
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
  }

  const row = await api.send.create.mutate({
    recipient: recipient.input,
    amount,
    note: note || undefined,
    txHash,
  });
  return {
    id: row.id,
    txId: row.tx_hash ?? row.id,
    timestamp: new Date(row.created_at).getTime(),
  };
}
