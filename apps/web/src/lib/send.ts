import { api } from "@/lib/api";
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
  txHash?: string;
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
  txHash,
}: SendPaymentParams): Promise<SendReceipt> {
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
