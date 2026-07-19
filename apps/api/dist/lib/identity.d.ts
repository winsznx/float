/**
 * Mirrors the frontend's IdentityResolution (DATA_CONTRACTS §1) exactly, plus
 * the resolved address the UI currently drops. `input` is echoed back so the
 * UI can render what the user typed.
 */
export type IdentityResolution = {
    input: string;
    type: "ens" | "farcaster" | "email" | "address";
    resolvedAddress: string | null;
    chains: string[];
    preferredChain: string;
    isNewUser: boolean;
};
export declare function resolveIdentity(input: string): Promise<IdentityResolution>;
/** Handle availability for onboarding. Free if no user has claimed it. */
export declare function checkHandleAvailability(handle: string): Promise<boolean>;
