import { api } from "@/lib/api";
import type { IdentityResolution } from "@/lib/identity";

export type FailureDestination = {
  id: string;
  label: string;
  address: string | null;
  available: boolean;
};

export type Pledge = {
  id: string;
  pledgeId: string;
  goal: string;
  stake: number;
  witness: string;
  failureDestinationLabel: string;
  deadline: string;
  isPublic: boolean;
  witnessUrl: string;
};

type CreatePledgeParams = {
  goal: string;
  stake: number;
  witness: IdentityResolution;
  destinationId: string;
  customAddress?: string;
  deadline: string;
  isPublic: boolean;
  onchainPledgeId?: string;
  txHash?: string;
};

const browserTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

/** Destination options with their real on-chain addresses. */
export async function getFailureDestinations(): Promise<FailureDestination[]> {
  return api.pledge.destinations.query();
}

export async function createPledge({
  goal,
  stake,
  witness,
  destinationId,
  customAddress,
  deadline,
  isPublic,
  onchainPledgeId,
  txHash,
}: CreatePledgeParams): Promise<Pledge> {
  const row = await api.pledge.create.mutate({
    goal,
    stakeAmount: stake,
    witness: witness.input,
    destinationId,
    customAddress,
    deadlineDate: deadline,
    timezone: browserTimeZone(),
    isPublic,
    onchainPledgeId,
    txHash,
  });

  return {
    id: row.id,
    pledgeId: row.onchain_pledge_id ?? row.id,
    goal: row.goal,
    stake: row.stake_amount,
    witness: row.witness_ref,
    failureDestinationLabel: row.failure_destination_label,
    deadline,
    isPublic: row.is_public,
    witnessUrl: row.witnessUrl,
  };
}
