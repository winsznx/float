"use client";

import { createWalletClient, custom, serializeSignature, getAddress } from "viem";
import { arbitrum } from "viem/chains";
import { getMagic, sign7702Authorization } from "@/lib/chain/magic";
import type { SignFn } from "@/lib/chain/contracts";

/**
 * Signs universal transactions with the Magic-provisioned wallet.
 *
 * Two signatures, two different schemes, and they are NOT interchangeable:
 *
 *   rootHash  → EIP-191 personal_sign over the raw 32 bytes.
 *   7702 auth → sign7702Authorization, which signs the raw authorization
 *               tuple. chainId 0 authorizes on every chain at once.
 *
 * The rootHash goes through a viem wallet client rather than a direct
 * `personal_sign` RPC call. Passing the hash straight to the provider let it
 * be treated as a UTF-8 string — signing the 66 characters "0x9170…" instead
 * of the 32 bytes they represent — which produces a valid signature over the
 * wrong preimage and comes back as "AA24 signature error" from the bundler.
 * viem's `{ raw }` form pins the encoding, and matches the flow proven to
 * settle on Arbitrum One.
 */
export function magicSigner(address: string): SignFn {
  return async ({ rootHash, authorizations }) => {
    const magic = getMagic();

    const wallet = createWalletClient({
      account: getAddress(address),
      chain: arbitrum,
      transport: custom(magic.rpcProvider as never),
    });

    const rootSignature = await wallet.signMessage({
      account: getAddress(address),
      message: { raw: rootHash as `0x${string}` },
    });

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
