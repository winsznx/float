import type { IdentityResolution } from "@/lib/identity";

export type FailureDestination = {
  id: string;
  label: string;
};

export const FAILURE_DESTINATIONS: FailureDestination[] = [
  { id: "gitcoin", label: "Gitcoin Grants treasury" },
  { id: "dao", label: "Recognized DAO multisig" },
  { id: "burn", label: "Burn address" },
];

export type Pledge = {
  pledgeId: string;
  goal: string;
  stake: number;
  witness: string;
  failureDestinationLabel: string;
  deadline: string;
  isPublic: boolean;
};

type CreatePledgeParams = {
  goal: string;
  stake: number;
  witness: IdentityResolution;
  failureDestinationLabel: string;
  deadline: string;
  isPublic: boolean;
};

// TODO: replace mock with PledgeVault.createPledge() contract call (see PRD Pledge Contract).
export async function createPledge({
  goal,
  stake,
  witness,
  failureDestinationLabel,
  deadline,
  isPublic,
}: CreatePledgeParams): Promise<Pledge> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return {
    pledgeId: `0x${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16)}`,
    goal,
    stake,
    witness: witness.input,
    failureDestinationLabel,
    deadline,
    isPublic,
  };
}
