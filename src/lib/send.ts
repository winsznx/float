import type { IdentityResolution } from "@/lib/identity";

export type SendReceipt = {
  txId: string;
  timestamp: number;
};

type SendPaymentParams = {
  recipient: IdentityResolution;
  amount: number;
  note: string;
};

// TODO: replace mock with Universal Account SDK cross-chain send (see PRD Core SDK Integration).
export async function sendPayment({
  recipient,
  amount,
  note,
}: SendPaymentParams): Promise<SendReceipt> {
  console.log(`Mock send of ${amount} USDC to ${recipient.input}`, { note });
  await new Promise((resolve) => setTimeout(resolve, 900));
  return {
    txId: `0x${"f".repeat(8)}${Date.now().toString(16)}`,
    timestamp: Date.now(),
  };
}
