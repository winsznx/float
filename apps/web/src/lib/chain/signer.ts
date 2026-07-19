"use client";

import { serializeSignature } from "viem";
import { getMagic, sign7702Authorization } from "@/lib/chain/magic";
import type { SignFn } from "@/lib/chain/contracts";

/**
 * Signs universal transactions with the Magic-provisioned wallet.
 *
 * Two signatures, two different schemes, and they are NOT interchangeable:
 *
 *   rootHash  → personal_sign (EIP-191). Signing it as a raw digest returns
 *               AA24 "signature error" from the bundler.
 *   7702 auth → sign7702Authorization, which signs the raw authorization
 *               tuple. chainId 0 means the authorization is valid on every
 *               chain, so one signature upgrades the account everywhere.
 */
export function magicSigner(address: string): SignFn {
  return async ({ rootHash, authorizations }) => {
    const magic = getMagic();

    // EIP-191 personal_sign over the 32-byte root hash.
    const rootSignature = (await magic.rpcProvider.request({
      method: "personal_sign",
      params: [rootHash, address],
    })) as string;

    const tuple = authorizations[0];
    if (!tuple) {
      throw new Error("Particle returned no EIP-7702 authorization to sign");
    }

    const signed = await sign7702Authorization({
      contractAddress: tuple.address as `0x${string}`,
      chainId: tuple.chainId,
      nonce: tuple.nonce,
    });

    // Magic returns {v, r, s}; Particle wants the packed 65-byte signature
    // with v normalized to yParity.
    const authSignature =
      signed.signature ??
      serializeSignature({
        r: signed.r as `0x${string}`,
        s: signed.s as `0x${string}`,
        yParity: signed.v >= 27 ? signed.v - 27 : signed.v,
      });

    return { rootSignature, authSignature };
  };
}
