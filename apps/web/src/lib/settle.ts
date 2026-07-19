"use client";

import { linkFetch } from "@/lib/api";
import {
  createUniversalAccount,
  createUsdcTransfer,
  CHAIN_IDS,
} from "@/lib/chain/universal-account";
import { resolvePledgeOnChain } from "@/lib/chain/contracts";
import { magicSigner } from "@/lib/chain/signer";
import { loginWithEmailOtp, getWalletAddress, isLoggedIn } from "@/lib/chain/magic";

/**
 * Actions taken from a capability link by someone who may have no FLOAT
 * account. They authenticate with Magic on the spot — that is the whole point
 * of the claim flows: the recipient never installs a wallet.
 */

/** Signs the caller in with Magic if they aren't already, and returns their address. */
async function ensureWallet(email?: string): Promise<string> {
  if (!(await isLoggedIn())) {
    if (!email) throw new Error("Enter your email to continue.");
    await loginWithEmailOtp(email);
  }
  const address = await getWalletAddress();
  if (!address) throw new Error("Magic returned no wallet address.");
  return address;
}

/**
 * Settles one member's share: a real cross-chain USDC transfer to the
 * organizer, sourced from whatever the member holds. The tx hash is required
 * by the API, so nothing is marked paid without one.
 */
export async function settleShareOnChain(params: {
  shareToken: string;
  memberId: string;
  organizerAddress: string;
  amount: number;
  email?: string;
}): Promise<{ txHash: string }> {
  const address = await ensureWallet(params.email);

  const ua = createUniversalAccount(address);
  const tx = await createUsdcTransfer(ua, params.organizerAddress, String(params.amount));
  const authTuples = await ua.getEIP7702Auth([CHAIN_IDS.ARBITRUM]);

  const { rootSignature, authSignature } = await magicSigner(address)({
    rootHash: tx.rootHash,
    authorizations: authTuples,
    userOpHashes: tx.userOps.map((op) => op.userOpHash),
  });

  const result = await ua.sendTransaction(
    tx,
    rootSignature,
    tx.userOps.map((op) => ({ userOpHash: op.userOpHash, signature: authSignature }))
  );
  const txHash = result?.transactionId ?? tx.transactionId;

  await linkFetch(`/settle/${params.shareToken}`, {
    method: "POST",
    body: { memberId: params.memberId, txHash },
  });

  return { txHash };
}

/**
 * The witness verdict. This is the only path that moves an escrowed stake, so
 * the on-chain call happens first and the API only records what the chain
 * already did.
 */
export async function giveWitnessVerdictOnChain(params: {
  witnessToken: string;
  onchainPledgeId: string;
  succeeded: boolean;
  email?: string;
}): Promise<{ txHash: string }> {
  const address = await ensureWallet(params.email);

  const { transactionId } = await resolvePledgeOnChain({
    witnessOwnerAddress: address,
    pledgeId: params.onchainPledgeId,
    succeeded: params.succeeded,
    sign: magicSigner(address),
  });

  await linkFetch(`/witness/${params.witnessToken}`, {
    method: "POST",
    body: { verdict: params.succeeded ? "success" : "failure", txHash: transactionId },
  });

  return { txHash: transactionId };
}
