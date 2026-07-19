"use client";

import { Magic } from "magic-sdk";
import type {
  Sign7702AuthorizationRequest,
  Sign7702AuthorizationResponse,
} from "@magic-sdk/types";
import { magicPublishableKey } from "@/lib/chain/config";

// Verified against magic-sdk@33.9.0 installed types:
//   magic.auth.loginWithEmailOTP / loginWithMagicLink
//   magic.user.getInfo / getIdToken / isLoggedIn / logout
//   magic.wallet.sign7702Authorization({contractAddress, chainId, nonce?})
//     → {contractAddress, chainId, nonce, v, r, s, signature?}
//   chainId 0 = universal cross-chain authorization (per SDK docs).

let instance: Magic | null = null;

/** Browser-only lazy singleton; throws on the server by design. */
export function getMagic(): Magic {
  if (typeof window === "undefined") {
    throw new Error("Magic SDK is browser-only — call from a client component");
  }
  if (!instance) {
    instance = new Magic(magicPublishableKey());
  }
  return instance;
}

/** Email-code login. Resolves to the DID token used for server verification. */
export async function loginWithEmailOtp(email: string): Promise<string | null> {
  return getMagic().auth.loginWithEmailOTP({ email });
}

export async function logout(): Promise<boolean> {
  return getMagic().user.logout();
}

export async function isLoggedIn(): Promise<boolean> {
  return getMagic().user.isLoggedIn();
}

export async function getWalletAddress(): Promise<string | null> {
  const info = await getMagic().user.getInfo();
  return info.wallets?.ethereum?.publicAddress ?? null;
}

/** DID token for the API to verify (Magic admin SDK) and mint a session from. */
export async function getIdToken(): Promise<string> {
  return getMagic().user.getIdToken();
}

/**
 * Sign an EIP-7702 authorization delegating the Magic EOA to `contractAddress`.
 * chainId 0 authorizes across all chains — the Universal Account upgrade path.
 */
export async function sign7702Authorization(
  params: Sign7702AuthorizationRequest
): Promise<Sign7702AuthorizationResponse> {
  return getMagic().wallet.sign7702Authorization(params);
}
