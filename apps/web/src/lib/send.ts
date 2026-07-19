import { api } from "@/lib/api";
import { createUniversalAccount, createUsdcTransfer } from "@/lib/chain/universal-account";
import { magicSigner } from "@/lib/chain/signer";
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
    const ua = createUniversalAccount(session.address);
    const tx = await createUsdcTransfer(ua, recipient.resolvedAddress, String(amount));
    const authTuples = await ua.getEIP7702Auth([42161]);
    const { rootSignature, authSignature } = await magicSigner(session.address)({
      rootHash: tx.rootHash,
      authorizations: authTuples,
      userOpHashes: tx.userOps.map((op) => op.userOpHash),
    });
    const result = await ua.sendTransaction(
      tx,
      rootSignature,
      tx.userOps.map((op) => ({ userOpHash: op.userOpHash, signature: authSignature }))
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
