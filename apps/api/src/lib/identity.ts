import { createPublicClient, http, isAddress, getAddress } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { env } from "./env.js";
import { serviceDb } from "./supabase.js";
import { chainsHoldingValue } from "./balance.js";

/**
 * Mirrors the frontend's IdentityResolution (DATA_CONTRACTS §1) exactly, plus
 * the resolved address the UI currently drops. `input` is echoed back so the
 * UI can render what the user typed.
 */
export type IdentityResolution = {
  input: string;
  type: "float" | "ens" | "farcaster" | "email" | "address";
  resolvedAddress: string | null;
  chains: string[];
  preferredChain: string;
  isNewUser: boolean;
};

const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(env.ethereumRpcUrl),
});

/** Has this address already onboarded to FLOAT? Drives the claim-link branch. */
async function isKnownUser(address: string): Promise<boolean> {
  const { data } = await serviceDb()
    .from("users")
    .select("id")
    .eq("address", address.toLowerCase())
    .maybeSingle();
  return !!data;
}

async function resolveEns(name: string): Promise<string | null> {
  try {
    return await ensClient.getEnsAddress({ name: normalize(name) });
  } catch {
    return null;
  }
}

/** FLOAT handle → the address of the account that claimed it. */
async function resolveFloatHandle(handle: string): Promise<string | null> {
  const normalized = handle.replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(normalized)) return null;
  const { data } = await serviceDb()
    .from("users")
    .select("address")
    .eq("handle", normalized)
    .maybeSingle();
  return data?.address ?? null;
}

/**
 * Farcaster handle → custody or verified address. Prefers a verified ETH
 * address over the custody address: custody is a signing key users rarely
 * fund, verified addresses are the ones they actually hold value in.
 */
async function resolveFarcaster(username: string): Promise<string | null> {
  const handle = username.replace(/^@/, "");
  const response = await fetch(
    `https://api.neynar.com/v2/farcaster/user/by_username?username=${encodeURIComponent(handle)}`,
    { headers: { "x-api-key": env.neynarApiKey }, signal: AbortSignal.timeout(10_000) }
  );
  if (!response.ok) return null;

  const body = (await response.json()) as {
    user?: {
      custody_address?: string;
      verified_addresses?: { eth_addresses?: string[] };
    };
  };
  const user = body?.user;
  if (!user) return null;

  const verified = user.verified_addresses?.eth_addresses?.[0];
  return (verified ?? user.custody_address) ?? null;
}

/** Address already registered against this email, if any. */
async function resolveEmail(email: string): Promise<string | null> {
  const { data } = await serviceDb()
    .from("users")
    .select("address")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return data?.address ?? null;
}

export async function resolveIdentity(input: string): Promise<IdentityResolution> {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Enter a name, handle, or email.");

  const base = { input: trimmed, chains: [] as string[], preferredChain: "Arbitrum" };

  const finish = async (
    type: IdentityResolution["type"],
    address: string | null
  ): Promise<IdentityResolution> => {
    if (!address) {
      return { ...base, type, resolvedAddress: null, isNewUser: true };
    }
    const checksummed = getAddress(address);
    const [{ chains, preferred }, known] = await Promise.all([
      chainsHoldingValue(checksummed),
      isKnownUser(checksummed),
    ]);
    return {
      ...base,
      type,
      resolvedAddress: checksummed,
      chains,
      preferredChain: preferred,
      isNewUser: !known,
    };
  };

  if (isAddress(trimmed)) return finish("address", trimmed);
  if (trimmed.includes("@") && !trimmed.startsWith("@")) {
    return finish("email", await resolveEmail(trimmed));
  }
  if (trimmed.toLowerCase().endsWith(".eth")) {
    return finish("ens", await resolveEns(trimmed));
  }

  // A bare or @-prefixed handle is ambiguous between FLOAT and Farcaster, and
  // FLOAT wins inside FLOAT. Resolving Farcaster first sent real money to a
  // recipient's Farcaster-verified address while their FLOAT account — the one
  // they were looking at — stayed empty. Farcaster remains the fallback, which
  // keeps every handle that isn't a FLOAT user working exactly as before.
  const floatAddress = await resolveFloatHandle(trimmed);
  if (floatAddress) return finish("float", floatAddress);

  return finish("farcaster", await resolveFarcaster(trimmed));
}

/** Handle availability for onboarding. Free if no user has claimed it. */
export async function checkHandleAvailability(handle: string): Promise<boolean> {
  const normalized = handle.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(normalized)) return false;
  const { data } = await serviceDb()
    .from("users")
    .select("id")
    .eq("handle", normalized)
    .maybeSingle();
  return !data;
}
