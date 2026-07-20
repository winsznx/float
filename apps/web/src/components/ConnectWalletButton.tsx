"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";

/**
 * Real wallet sign-in.
 *
 * This used to be a plain <Link> to /onboarding/identity, which walked the
 * user past authentication entirely — they'd land in the app with no session,
 * an empty balance, and no indication anything was wrong.
 */
export function ConnectWalletButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      // Loaded on demand: wagmi's connectors touch browser globals, and this
      // button renders on the landing page which is statically prerendered.
      const { signInWithWallet } = await import("@/lib/wallet");
      await signInWithWallet();

      const { api } = await import("@/lib/api");
      let hasHandle = false;
      try {
        const me = await api.auth.me.query();
        hasHandle = !!me?.handle;
      } catch {
        // Profile read failure shouldn't block a verified sign-in.
      }

      router.push(hasHandle ? "/home" : "/onboarding/identity");
    } catch (caught) {
      // Covers a rejected signature, a locked wallet, and no wallet installed.
      setError(getErrorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={connect} disabled={busy} className={className}>
        {busy ? "Check your wallet" : "Connect wallet"}
      </button>
      {error && (
        <p role="alert" className="max-w-[280px] text-center font-body text-[12px] text-coral">
          {error}
        </p>
      )}
    </div>
  );
}
