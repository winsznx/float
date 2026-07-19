import { api } from "@/lib/api";

export type IdentityResolution = {
  input: string;
  type: "ens" | "farcaster" | "email" | "address";
  resolvedAddress: string | null;
  chains: string[];
  preferredChain: string;
  isNewUser: boolean;
};

/** Live ENS (viem) / Farcaster (Neynar) / email resolution through the API. */
export async function resolveIdentity(input: string): Promise<IdentityResolution> {
  return api.identity.resolve.query({ input });
}

export async function checkHandleAvailability(handle: string): Promise<boolean> {
  return api.auth.handleAvailable.query({ handle });
}
