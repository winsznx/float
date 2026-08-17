import type { Hono, Env } from "hono";
import {
  createPublicClient,
  createWalletClient,
  http,
  getAddress,
  isAddress,
  type SignedAuthorization,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { recoverAuthorizationAddress } from "viem/utils";
import { arbitrum } from "viem/chains";
import { env } from "../lib/env.js";
import { accountFor } from "../lib/balance.js";
import { getErrorMessage } from "../lib/errors.js";

/**
 * Sponsored EIP-7702 delegation.
 *
 * A Universal Account has to be delegated before it can run any transaction,
 * and the account paid for that itself — a real type-4 transaction from the
 * user's own wallet. Measured on Arbitrum it is only a fraction of a cent, but
 * a wallet Magic has just provisioned holds exactly zero ETH, so a brand-new
 * user could not complete their first send at all. The app promised gasless and
 * then asked for gas it had no way to give them.
 *
 * EIP-7702 separates who signs the authorization from who pays for the
 * transaction carrying it, so the fix is to submit it ourselves. The user signs
 * a tuple — no transaction, no gas — and this pays to land it.
 *
 * ⚠ The authorization nonce is the account's CURRENT nonce, not nonce + 1. The
 * +1 applies only when the account sends its own type-4, because that
 * transaction consumes a nonce before the authorization takes effect. Verified
 * on Arbitrum mainnet: a zero-balance account signed at nonce 0, sponsor
 * submitted, and eth_getCode returned the delegation designator.
 */

const CHAIN = arbitrum;
const DELEGATED_PREFIX = "0xef0100";

/**
 * Explicit, because estimation cannot be trusted for this transaction type.
 *
 * EIP-7702 adds 25,000 of intrinsic gas per authorization on top of the 21,000
 * base, and not every provider accounts for it: Alchemy's eth_estimateGas
 * returns a figure the node then rejects as "intrinsic gas too low", while the
 * public Arbitrum RPC estimates the same transaction correctly. A delegation is
 * a fixed, known cost — measured at 48,133 gas on Arbitrum — so naming it
 * outright removes the dependency on whichever provider is configured.
 *
 * Unused gas is refunded, so the headroom costs nothing.
 */
const DELEGATION_GAS = 150_000n;

// Lazy, not module-scope: bindings populate process.env per isolate, and a
// client captured at import time could pin the fallback RPC forever.
function publicClient() {
  return createPublicClient({ chain: CHAIN, transport: http(env.arbitrumRpcUrl) });
}

type DelegateBody = {
  address?: string;
  contractAddress?: string;
  nonce?: number;
  r?: string;
  s?: string;
  v?: number;
  yParity?: number;
};

async function isDelegated(address: `0x${string}`): Promise<boolean> {
  const code = await publicClient().getCode({ address });
  return !!code && code.toLowerCase().startsWith(DELEGATED_PREFIX);
}

/**
 * The implementation Particle expects for this account, asked of Particle
 * rather than hardcoded. Without this check the endpoint would pay to delegate
 * any account to any contract a caller named.
 */
async function expectedImplementation(address: string): Promise<string | null> {
  const [auth] = await accountFor(address).getEIP7702Auth([CHAIN.id]);
  const target = (auth as { address?: string } | undefined)?.address;
  return target ? getAddress(target) : null;
}

export function registerDelegateRoutes<E extends Env>(app: Hono<E>) {
  /**
   * What to sign. The nonce comes from the chain rather than the caller: the
   * signature commits to it, so a stale value produces an authorization that is
   * silently ignored rather than an error anyone can see.
   */
  app.get("/:address", async (c) => {
    const raw = c.req.param("address");
    if (!isAddress(raw)) {
      return c.json({ error: "Not a valid address." }, 400);
    }
    const address = getAddress(raw);

    try {
      const [delegated, implementation, nonce] = await Promise.all([
        isDelegated(address),
        expectedImplementation(address),
        publicClient().getTransactionCount({ address }),
      ]);

      if (!implementation) {
        return c.json({ error: "Couldn't prepare your account for upgrade." }, 502);
      }
      return c.json({ delegated, contractAddress: implementation, nonce, chainId: CHAIN.id });
    } catch (error) {
      console.error("delegation preflight failed", error);
      return c.json({ error: "Couldn't prepare your account for upgrade." }, 502);
    }
  });

  /** Submits the signed authorization and pays for it. */
  app.post("/", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as DelegateBody;
    const { address, contractAddress, nonce, r, s } = body;

    if (!address || !isAddress(address) || !contractAddress || !isAddress(contractAddress)) {
      return c.json({ error: "address and contractAddress are required." }, 400);
    }
    if (typeof nonce !== "number" || !Number.isInteger(nonce) || nonce < 0) {
      return c.json({ error: "A valid nonce is required." }, 400);
    }
    if (!r || !s) {
      return c.json({ error: "A signed authorization is required." }, 400);
    }

    const owner = getAddress(address);
    const implementation = getAddress(contractAddress);

    // v is 27/28 on some signers and 0/1 on others; EIP-7702 wants yParity.
    const yParity =
      typeof body.yParity === "number"
        ? body.yParity
        : typeof body.v === "number"
          ? body.v >= 27
            ? body.v - 27
            : body.v
          : undefined;
    if (yParity !== 0 && yParity !== 1) {
      return c.json({ error: "A signed authorization is required." }, 400);
    }

    const authorization: SignedAuthorization = {
      address: implementation,
      chainId: CHAIN.id,
      nonce,
      r: r as `0x${string}`,
      s: s as `0x${string}`,
      yParity,
    };

    try {
      // Already delegated is success, not an error: the caller wanted the
      // account usable and it is. Also stops a repeat call spending again.
      if (await isDelegated(owner)) {
        return c.json({ delegated: true, txHash: null });
      }

      // The signature has to belong to the account being delegated. Without
      // this anyone could have us pay to delegate someone else's wallet.
      const signer = await recoverAuthorizationAddress({ authorization });
      if (getAddress(signer) !== owner) {
        return c.json({ error: "That authorization isn't yours." }, 400);
      }

      const expected = await expectedImplementation(owner);
      if (!expected || expected !== implementation) {
        return c.json({ error: "Unexpected delegation target." }, 400);
      }

      const onchainNonce = await publicClient().getTransactionCount({ address: owner });
      if (onchainNonce !== nonce) {
        // Signed against a nonce the chain has moved past, so it would be
        // ignored on inclusion. Hand back the current one to re-sign against.
        return c.json({ error: "Authorization is stale.", nonce: onchainNonce }, 409);
      }

      const sponsor = privateKeyToAccount(env.sponsorPrivateKey as `0x${string}`);
      const wallet = createWalletClient({
        account: sponsor,
        chain: CHAIN,
        transport: http(env.arbitrumRpcUrl),
      });

      const txHash = await wallet.sendTransaction({
        authorizationList: [authorization],
        to: owner,
        data: "0x",
        gas: DELEGATION_GAS,
      });
      const receipt = await publicClient().waitForTransactionReceipt({ hash: txHash });

      if (receipt.status !== "success" || !(await isDelegated(owner))) {
        console.error("sponsored delegation did not take effect", txHash);
        return c.json({ error: "The upgrade didn't go through. Try again." }, 502);
      }

      console.log("sponsored delegation", owner, txHash);
      return c.json({ delegated: true, txHash });
    } catch (error) {
      console.error("sponsored delegation failed", error);
      return c.json({ error: getErrorMessage(error) }, 502);
    }
  });
}
