import { api } from "@/lib/api";
import { createLeashOnChain, revokeLeashOnChain } from "@/lib/chain/contracts";
import { magicSigner } from "@/lib/chain/signer";
import { readSession } from "@/lib/session";
import type { IdentityResolution } from "@/lib/identity";

export type ContractScope = "basic" | "advanced";

export type Leash = {
  id: string;
  leashId: string;
  beneficiary: string;
  spendLimit: number;
  spent: number;
  contractScope: ContractScope;
  contractAddress: string | null;
  expiry: string;
  claimUrl: string;
};

type CreateLeashParams = {
  beneficiary: IdentityResolution;
  spendLimit: number;
  contractScope: ContractScope;
  contractAddress: string | null;
  expiry: string;
};

const browserTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

/** End-of-day in the creator's zone, matching the server's deadline rule. */
function endOfDayUnix(date: string): number {
  return Math.floor(new Date(`${date}T23:59:59`).getTime() / 1000);
}

export async function createLeash({
  beneficiary,
  spendLimit,
  contractScope,
  contractAddress,
  expiry,
}: CreateLeashParams): Promise<Leash> {
  const session = readSession();
  if (!session) throw new Error("Sign in to create a leash.");
  if (!beneficiary.resolvedAddress) {
    throw new Error("Couldn't resolve that beneficiary to an address.");
  }

  // The chain call happens first: if it reverts there is nothing to record,
  // and a row without a transaction would claim authority that doesn't exist.
  const { transactionId } = await createLeashOnChain({
    ownerAddress: session.address,
    beneficiaryAddress: beneficiary.resolvedAddress,
    spendLimitUsd: spendLimit,
    expiryUnix: endOfDayUnix(expiry),
    sign: magicSigner(session.address),
  });

  const row = await api.leash.create.mutate({
    beneficiary: beneficiary.input,
    spendLimit,
    contractScope,
    allowedContracts: contractAddress ? [contractAddress] : [],
    expiryDate: expiry,
    // The deadline is end-of-day in the creator's zone, resolved server-side.
    timezone: browserTimeZone(),
    txHash: transactionId,
  });

  return {
    id: row.id,
    leashId: row.onchain_leash_id ?? row.id,
    beneficiary: row.beneficiary_ref,
    spendLimit: row.spend_limit,
    spent: row.spent,
    contractScope: row.contract_scope as ContractScope,
    contractAddress: row.allowed_contracts?.[0] ?? null,
    expiry,
    claimUrl: row.claimUrl,
  };
}

/** Dollars spent so far. Mirrored from chain events by the indexer. */
export async function getLeashUsage(id: string): Promise<number> {
  const row = await api.leash.get.query({ id });
  return row.spent;
}

export async function revokeLeash(id: string, onchainLeashId: string | null): Promise<void> {
  const session = readSession();
  if (!session) throw new Error("Sign in to revoke.");
  if (!onchainLeashId) {
    throw new Error("This leash has no on-chain id yet.");
  }

  const { transactionId } = await revokeLeashOnChain({
    ownerAddress: session.address,
    leashId: onchainLeashId,
    sign: magicSigner(session.address),
  });

  await api.leash.revoke.mutate({ id, txHash: transactionId });
}
