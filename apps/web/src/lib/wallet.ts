"use client";

import { connect, getAccount, signMessage, disconnect } from "wagmi/actions";
import { injected } from "wagmi/connectors";
import { wagmiConfig } from "@/lib/chain/wagmi";
import { api } from "@/lib/api";
import { writeSession, type StoredSession } from "@/lib/session";

/**
 * Existing-wallet sign-in.
 *
 * The user proves control of their EOA by signing a nonce; the API verifies
 * the signature server-side and mints a session. The browser never asserts its
 * own identity — an address alone proves nothing, since anyone can claim one.
 *
 * This is the EIP-7702 path from the PRD: the address they already have
 * becomes their Universal Account, with no migration and no new address.
 */
export async function signInWithWallet(): Promise<StoredSession> {
  let account = getAccount(wagmiConfig);

  if (!account.address) {
    const result = await connect(wagmiConfig, { connector: injected() });
    if (!result.accounts.length) {
      throw new Error("No wallet account was returned.");
    }
    account = getAccount(wagmiConfig);
  }

  const address = account.address;
  if (!address) throw new Error("Couldn't read your wallet address.");

  // Server-issued nonce, so a signature can't be replayed from elsewhere.
  const { nonce, message } = await api.auth.walletNonce.mutate({ address });
  const signature = await signMessage(wagmiConfig, { account: address, message });

  const session = await api.auth.loginWithWallet.mutate({ address, nonce, signature });
  writeSession(session);
  return session;
}

export async function disconnectWallet(): Promise<void> {
  try {
    await disconnect(wagmiConfig);
  } catch {
    // Nothing connected — the local session is what actually matters.
  }
}

export function connectedAddress(): string | null {
  return getAccount(wagmiConfig).address ?? null;
}
