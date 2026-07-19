import { api } from "@/lib/api";
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
  onchainLeashId?: string;
  txHash?: string;
};

const browserTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export async function createLeash({
  beneficiary,
  spendLimit,
  contractScope,
  contractAddress,
  expiry,
  onchainLeashId,
  txHash,
}: CreateLeashParams): Promise<Leash> {
  const row = await api.leash.create.mutate({
    beneficiary: beneficiary.input,
    spendLimit,
    contractScope,
    allowedContracts: contractAddress ? [contractAddress] : [],
    expiryDate: expiry,
    // The deadline is end-of-day in the creator's zone, resolved server-side.
    timezone: browserTimeZone(),
    onchainLeashId,
    txHash,
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

export async function revokeLeash(id: string, txHash: string): Promise<void> {
  await api.leash.revoke.mutate({ id, txHash });
}
