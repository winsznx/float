import { api } from "@/lib/api";
import { createPledgeOnChain } from "@/lib/chain/contracts";
import { magicSigner } from "@/lib/chain/signer";
import { readSession } from "@/lib/session";
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
};

const browserTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

/** Destination options with their real on-chain addresses. */
export async function getFailureDestinations(): Promise<FailureDestination[]> {
  return api.pledge.destinations.query();
}

function endOfDayUnix(date: string): number {
  return Math.floor(new Date(`${date}T23:59:59`).getTime() / 1000);
}

export async function createPledge({
  goal,
  stake,
  witness,
  destinationId,
  customAddress,
  deadline,
  isPublic,
}: CreatePledgeParams): Promise<Pledge> {
  const session = readSession();
  if (!session) throw new Error("Sign in to lock a pledge.");
  if (!witness.resolvedAddress) {
    throw new Error("The witness needs an address that resolves on-chain.");
  }

  // Resolve the destination address before locking — the contract rejects the
  // zero address, and a stake locked against an unreachable destination could
  // only ever be slashed into nothing.
  const destinations = await getFailureDestinations();
  const destination =
    destinationId === "custom"
      ? customAddress
      : destinations.find((d) => d.id === destinationId)?.address;
  if (!destination) {
    throw new Error("Pick a destination with a configured address.");
  }

  // Stake moves on-chain first; only a real lock gets recorded.
  const { transactionId } = await createPledgeOnChain({
    ownerAddress: session.address,
    witnessAddress: witness.resolvedAddress,
    failureDestination: destination,
    stakeUsd: stake,
    deadlineUnix: endOfDayUnix(deadline),
    sign: magicSigner(session.address),
  });

  const row = await api.pledge.create.mutate({
    goal,
    stakeAmount: stake,
    witness: witness.input,
    destinationId,
    customAddress,
    deadlineDate: deadline,
    timezone: browserTimeZone(),
    isPublic,
    txHash: transactionId,
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
