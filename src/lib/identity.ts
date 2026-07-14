// TODO: replace mock with real handle registry / ENS availability lookup.
export async function checkHandleAvailability(handle: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return !handle.toLowerCase().includes("taken");
}

export type IdentityResolution = {
  input: string;
  type: "ens" | "farcaster" | "email" | "address";
  resolvedAddress: string | null;
  chains: string[];
  preferredChain: string;
  isNewUser: boolean;
};

const MOCK_RESOLVED_ADDRESS = `0x${"a1b2c3d4e5".repeat(4)}`;

// TODO: replace mock with real ENS / Farcaster / email resolution service (see PRD Identity Resolution Service).
export async function resolveIdentity(input: string): Promise<IdentityResolution> {
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (input.includes("@")) {
    return {
      input,
      type: "email",
      resolvedAddress: null,
      chains: [],
      preferredChain: "",
      isNewUser: true,
    };
  }

  if (input.toLowerCase().endsWith(".eth")) {
    return {
      input,
      type: "ens",
      resolvedAddress: MOCK_RESOLVED_ADDRESS,
      chains: ["Base", "Arbitrum"],
      preferredChain: "Arbitrum",
      isNewUser: false,
    };
  }

  return {
    input,
    type: "address",
    resolvedAddress: null,
    chains: [],
    preferredChain: "",
    isNewUser: false,
  };
}
