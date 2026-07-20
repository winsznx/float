"use client";

import { createWalletClient, custom, serializeSignature, getAddress } from "viem";
import { arbitrum } from "viem/chains";
import { getMagic, sign7702Authorization, delegateAccount } from "@/lib/chain/magic";
import { createUniversalAccount, CHAIN_IDS } from "@/lib/chain/universal-account";
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
 * Costs one small gas fee, once per account, and is a no-op afterwards.
 */
export async function ensureDelegated(address: string): Promise<void> {
  const ua = createUniversalAccount(address);

  const deployments = await ua.getEIP7702Deployments();
  const target = deployments.find(
    (d: { chainId: number; isDelegated?: boolean }) => d.chainId === CHAIN_IDS.ARBITRUM
  );
  if (target?.isDelegated) return;

  const [auth] = await ua.getEIP7702Auth([CHAIN_IDS.ARBITRUM]);
  if (!auth) throw new Error("Couldn't prepare your account for upgrade.");

  await delegateAccount({
    delegateContract: auth.address,
    // The real chain, never the 0 the auth tuple carries.
    chainId: CHAIN_IDS.ARBITRUM,
    nonce: auth.nonce,
    ownerAddress: getAddress(address),
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
