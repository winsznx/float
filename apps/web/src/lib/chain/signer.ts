"use client";

import { createWalletClient, custom, serializeSignature, getAddress } from "viem";
import { arbitrum } from "viem/chains";
import { getMagic, sign7702Authorization, getMagicChainId } from "@/lib/chain/magic";
import { apiFetch } from "@/lib/api";
import { CHAIN_IDS } from "@/lib/chain/universal-account";
import type { ITransaction, EIP7702Authorization } from "@/lib/chain/universal-account";

/**
 * Signs universal transactions with the Magic-provisioned wallet.
 *
 * Two signatures, two different schemes, and they are NOT interchangeable:
 *
 *   rootHash  → EIP-191 personal_sign over the raw 32 bytes.
 *   7702 auth → sign7702Authorization over the authorization tuple.
 *
 * ⚠ The authorization must come from `userOp.eip7702Auth`, not from
 * `getEIP7702Auth()`. The standalone call returns `chainId: 0` — a
 * chain-agnostic authorization — and **Magic cannot sign chainId 0**. Doing so
 * yields a signature the bundler rejects with the opaque "AA24 signature
 * error". Each userOp carries its own chain-specific auth, which Magic signs
 * correctly. (Confirmed against Particle's own Magic + 7702 demo.)
 *
 * A userOp whose account is already delegated sets `eip7702Delegated` and
 * needs no authorization at all; sending one anyway is what breaks a second
 * transaction from an account that worked the first time.
 */
/**
 * Delegates the account if it isn't already, before any Universal Account
 * transaction is built.
 *
 * A fresh Magic wallet has no delegation, and attaching an authorization to
 * the first transfer doesn't work: the authorization Particle hands back is
 * chain-agnostic (chainId 0) and Magic can't sign that. Delegating as its own
 * chain-specific step means every later userOp reports `eip7702Delegated` and
 * needs no authorization at all.
 *
 * The wallet only signs; the API pays to submit it. This used to be a real
 * transaction from the user's own wallet, which a Magic wallet provisioned
 * seconds earlier could never afford — the first send of every new account
 * failed for want of gas the app had promised it would not need.
 *
 * A no-op once the account is delegated.
 */
export async function ensureDelegated(address: string): Promise<void> {
  const owner = getAddress(address);

  // What to sign, decided by the API against live chain state. The signature
  // commits to the nonce, so taking it from anywhere staler produces an
  // authorization that is silently ignored on inclusion rather than rejected.
  const preflight = await apiFetch<{
    delegated: boolean;
    contractAddress: string;
    nonce: number;
  }>(`/delegate/${owner}`);
  if (preflight.delegated) return;

  // Magic is pinned to Arbitrum at construction (see magicNetwork), so this
  // should never fire. It stays because the failure it catches is invisible:
  // on the wrong chain the authorization is signed for the wrong place and is
  // simply ignored, with nothing to say why.
  const magicChainId = await getMagicChainId();
  if (magicChainId !== CHAIN_IDS.ARBITRUM) {
    throw new Error(
      `Wallet is on chain ${magicChainId}, but FLOAT settles on Arbitrum One (${CHAIN_IDS.ARBITRUM}).`
    );
  }

  // Signing only — no transaction leaves this wallet, so it needs no ETH. The
  // nonce is the account's current one: the +1 belongs to the case where the
  // account sends its own type-4 and consumes a nonce first.
  const signed = await sign7702Authorization({
    contractAddress: preflight.contractAddress as `0x${string}`,
    chainId: CHAIN_IDS.ARBITRUM,
    nonce: preflight.nonce,
  });

  await apiFetch("/delegate", {
    method: "POST",
    body: {
      address: owner,
      contractAddress: preflight.contractAddress,
      nonce: preflight.nonce,
      r: signed.r,
      s: signed.s,
      v: signed.v,
    },
  });
}

export type SignedTransaction = {
  rootSignature: string;
  authorizations: EIP7702Authorization[];
};

export async function signUniversalTransaction(
  address: string,
  tx: ITransaction
): Promise<SignedTransaction> {
  const magic = getMagic();
  const owner = getAddress(address);

  const authorizations: EIP7702Authorization[] = [];
  // One signature per nonce — the same authorization covers every userOp that
  // shares it, and re-signing would burn a prompt per operation.
  const byNonce = new Map<number, string>();

  for (const op of tx.userOps ?? []) {
    if (!op.eip7702Auth || op.eip7702Delegated) continue;

    let signature = byNonce.get(op.eip7702Auth.nonce);
    if (!signature) {
      const signed = await sign7702Authorization({
        contractAddress: op.eip7702Auth.address as `0x${string}`,
        // Chain-specific, never the 0 that getEIP7702Auth returns.
        chainId: op.eip7702Auth.chainId || op.chainId,
        nonce: op.eip7702Auth.nonce,
      });

      signature =
        signed.signature ??
        serializeSignature({
          r: signed.r as `0x${string}`,
          s: signed.s as `0x${string}`,
          yParity: signed.v >= 27 ? signed.v - 27 : signed.v,
        });
      byNonce.set(op.eip7702Auth.nonce, signature);
    }

    authorizations.push({ userOpHash: op.userOpHash, signature });
  }

  // The root hash is signed over its raw 32 bytes, not as a hex string.
  const wallet = createWalletClient({
    account: owner,
    chain: arbitrum,
    transport: custom(magic.rpcProvider as never),
  });
  const rootSignature = await wallet.signMessage({
    account: owner,
    message: { raw: tx.rootHash as `0x${string}` },
  });

  return { rootSignature, authorizations };
}
