"use client";

import { Magic } from "magic-sdk";
import type {
  Sign7702AuthorizationRequest,
  Sign7702AuthorizationResponse,
} from "@magic-sdk/types";
import { magicPublishableKey, magicNetwork } from "@/lib/chain/config";

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
    // Pinned to Arbitrum. This SDK version has no switchChain, so the network
    // given here is the only one the wallet will ever sign or send on.
    instance = new Magic(magicPublishableKey(), { network: magicNetwork });
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

/** Email of the currently signed-in Magic user, if any. */
export async function getSignedInEmail(): Promise<string | null> {
  try {
    const info = await getMagic().user.getInfo();
    return info.email ?? null;
  } catch {
    return null;
  }
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
 *
 * ⚠ chainId must be a real chain. Magic cannot sign a chain-agnostic
 * authorization (chainId 0) — it returns a signature the bundler rejects as
 * "AA24 signature error".
 */
export async function sign7702Authorization(
  params: Sign7702AuthorizationRequest
): Promise<Sign7702AuthorizationResponse> {
  return getMagic().wallet.sign7702Authorization(params);
}

/**
 * Sends a type-4 transaction that delegates the EOA in place.
 *
 * The account has to be delegated before it can run Universal Account
 * transactions. Doing it as its own step — rather than attaching an
 * authorization to the first transfer — is what Particle's own Magic demo
 * does, and it sidesteps the chainId-0 problem entirely: afterwards every
 * userOp reports `eip7702Delegated` and needs no authorization at all.
 *
 * The nonce is the authorization nonce plus one, because this transaction
 * consumes a nonce itself before the authorization takes effect.
 */
/** The chain Magic's provider is actually operating on. */
export async function getMagicChainId(): Promise<number> {
  const hex = (await getMagic().rpcProvider.request({
    method: "eth_chainId",
    params: [],
  })) as string;
  return Number(hex);
}

export async function delegateAccount(params: {
  delegateContract: string;
  chainId: number;
  nonce: number;
  ownerAddress: string;
}): Promise<void> {
  const magic = getMagic();

  const authorization = await magic.wallet.sign7702Authorization({
    contractAddress: params.delegateContract,
    chainId: params.chainId,
    nonce: params.nonce + 1,
  });

  await magic.wallet.send7702Transaction({
    to: params.ownerAddress,
    data: "0x",
    authorizationList: [authorization],
  });
}
