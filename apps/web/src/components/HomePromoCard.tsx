"use client";

import { useState } from "react";
import Link from "next/link";
import { readSession } from "@/lib/session";

/**
 * Second card on the home screen.
 *
 * An empty wallet used to be a dead end: balance $0.00, empty feed, and every
 * mode requiring funds the user had no way to add. So when there's nothing in
 * the account this shows the deposit address instead of an upsell — the one
 * action that actually unblocks them.
 */
export function HomePromoCard({ balance }: { balance?: number }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const address = readSession()?.address ?? null;

  const isEmpty = balance !== undefined && balance <= 0;

  async function copyAddress() {
    if (!address) return;
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard is unavailable over plain HTTP and in some in-app browsers.
      setCopyFailed(true);
    }
  }

  if (isEmpty && address) {
    return (
      <div className="flex w-full flex-col justify-between rounded-2xl border-2 border-void bg-void-3 p-6 shadow-[6px_6px_0_0_var(--color-brut-line)]">
        <span className="font-mono text-xs uppercase tracking-wide text-muted">
          Add funds
        </span>
        <div>
          <p className="mt-2 font-display text-[19px] font-bold text-text">
            Send USDC here to start
          </p>
          <p className="mt-2 break-all font-mono text-[11px] leading-[1.5] text-muted">
            {address}
          </p>
          <p className="mt-2 font-body text-[12px] text-muted-2">
            On Arbitrum, Base, Ethereum, BNB, or Solana — FLOAT pools them.
          </p>

          <button
            type="button"
            onClick={copyAddress}
            className="mt-3 rounded-full border-2 border-void bg-surface px-4 py-2 font-body text-[13px] font-medium text-text shadow-[3px_3px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[0_0_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            {copied ? "Copied" : "Copy address"}
          </button>
          {copyFailed && (
            <p role="alert" className="mt-2 font-body text-[12px] text-coral">
              Couldn&apos;t copy — select the address above.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Link
      href="/leash"
      className="flex w-full flex-col justify-between rounded-2xl border-2 border-void bg-void-3 p-6 shadow-[6px_6px_0_0_var(--color-brut-line)] transition-all duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_var(--color-brut-line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-signal-dim)]"
    >
      <span className="font-mono text-xs uppercase tracking-wide text-muted">
        Do more
      </span>
      <div>
        <p className="mt-2 font-display text-[19px] font-bold text-text">
          Do more with FLOAT
        </p>
        <p className="mt-2 font-body text-[13px] text-muted">
          Hand out a Leash or lock in a Pledge.
        </p>
      </div>
    </Link>
  );
}
