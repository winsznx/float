import type { IdentityResolution } from "@/lib/identity";

export type ContractScope = "basic" | "advanced";

export type Leash = {
  leashId: string;
  beneficiary: string;
  spendLimit: number;
  contractScope: ContractScope;
  contractAddress: string | null;
  expiry: string;
};

type CreateLeashParams = {
  beneficiary: IdentityResolution;
  spendLimit: number;
  contractScope: ContractScope;
  contractAddress: string | null;
  expiry: string;
};

// TODO: replace mock with LeashManager.createLeash() contract call (see PRD Leash Contract).
export async function createLeash({
  beneficiary,
  spendLimit,
  contractScope,
  contractAddress,
  expiry,
}: CreateLeashParams): Promise<Leash> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return {
    leashId: `0x${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16)}`,
    beneficiary: beneficiary.input,
    spendLimit,
    contractScope,
    contractAddress,
    expiry,
  };
}

const DEMO_REFERENCE_LIMIT = 500;
const DEMO_REFERENCE_USED = 180;

// TODO: replace mock with live usage feed from LeashManager.remainingBalance() (see PRD Active Leash dashboard).
export async function getLeashUsage(
  leashId: string,
  spendLimit: number
): Promise<number> {
  void leashId;
  await new Promise((resolve) => setTimeout(resolve, 400));
  return Math.min(spendLimit, (DEMO_REFERENCE_USED / DEMO_REFERENCE_LIMIT) * spendLimit);
}

// TODO: replace mock with LeashManager.revoke() contract call.
export async function revokeLeash(leashId: string): Promise<void> {
  void leashId;
  await new Promise((resolve) => setTimeout(resolve, 500));
}
