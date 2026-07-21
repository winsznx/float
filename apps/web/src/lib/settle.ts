"use client";

import { linkFetch } from "@/lib/api";
import { recordAfterTransfer } from "@/lib/money-moved";
import {
  createUniversalAccount,
  createUsdcTransfer,
  destinationChainFor,
  type DestinationChain,
} from "@/lib/chain/universal-account";
import { resolveIdentity } from "@/lib/identity";
import { resolvePledgeOnChain, spendLeashOnChain } from "@/lib/chain/contracts";
import { signUniversalTransaction, ensureDelegated } from "@/lib/chain/signer";
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
 * Which chain to pay an organizer on, resolved from where they actually hold
 * value — identity.resolve is a public procedure, so this works from a
 * capability link with no session.
 *
 * A failure here falls back to the default destination rather than propagating:
 * settling on a less convenient chain beats not settling at all.
 */
async function organizerDestination(address: string): Promise<DestinationChain> {
  try {
    const { preferredChain } = await resolveIdentity(address);
    return destinationChainFor(preferredChain);
  } catch {
    return destinationChainFor(null);
  }
}

/**
 * Settles one member's share: a real cross-chain USDC transfer to the
 * organizer, sourced from whatever the member holds and delivered on the
 * organizer's own chain. The tx hash is required by the API, so nothing is
 * marked paid without one.
 */
export async function settleShareOnChain(params: {
  shareToken: string;
  memberId: string;
  organizerAddress: string;
  amount: number;
  email?: string;
}): Promise<{ txHash: string }> {
  const address = await ensureWallet(params.email);

  await ensureDelegated(address);
  const ua = createUniversalAccount(address);
  const destination = await organizerDestination(params.organizerAddress);
  const { tx } = await createUsdcTransfer(
    ua,
    params.organizerAddress,
    String(params.amount),
    destination.id
  );
  const { rootSignature, authorizations } = await signUniversalTransaction(address, tx);

  const result = await ua.sendTransaction(
    tx,
    rootSignature,
    authorizations.length > 0 ? authorizations : undefined
  );
  const txHash = result?.transactionId ?? tx.transactionId;

  // The share is paid the moment the transfer lands. If marking it settled
  // fails, the caller must not re-offer "Settle" on a share that has already
  // been paid for.
  await recordAfterTransfer(txHash, () =>
    linkFetch(`/settle/${params.shareToken}`, {
      method: "POST",
      body: { memberId: params.memberId, txHash },
    })
  );

  return { txHash };
}

/**
 * Spends from a leash you've been granted.
 *
 * Signed by the beneficiary — the contract rejects anyone else — and the funds
 * move straight from the owner to the destination. The indexer picks up the
 * LeashSpent event and updates the remaining balance, so nothing is written
 * here: the chain is what says how much authority has been used.
 */
export async function spendFromLeashOnChain(params: {
  leashId: string;
  amount: number;
  to: string;
  email?: string;
}): Promise<{ txHash: string }> {
  const address = await ensureWallet(params.email);

  const { transactionId } = await spendLeashOnChain({
    beneficiaryAddress: address,
    leashId: params.leashId,
    amountUsd: params.amount,
    to: params.to,
    sign: (tx) => signUniversalTransaction(address, tx),
  });

  return { txHash: transactionId };
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
    sign: (tx) => signUniversalTransaction(address, tx),
  });

  await linkFetch(`/witness/${params.witnessToken}`, {
    method: "POST",
    body: { verdict: params.succeeded ? "success" : "failure", txHash: transactionId },
  });

  return { txHash: transactionId };
}
